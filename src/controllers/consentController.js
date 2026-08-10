const pool = require("../config/db");
const { consentCreateSchema } = require("../validators/consentValidator");

const createConsent = async (req, res) => {
    try {
        const validation = consentCreateSchema.safeParse(req.body);

        if (!validation.success) {
            return res.status(400).json({
                success: false,
                errors: validation.error.issues
            });
        }

        const idempotencyKey = req.headers["idempotency-key"];
        const {
            subjectType,
            subjectId,
            consentType,
            granted,
            expiresAt,
            details
        } = req.body;

        if (!idempotencyKey) {
            return res.status(400).json({
                success: false,
                message: "Idempotency-Key header required"
            });
        }

        if (subjectType === "company" && subjectId !== req.user?.companyId) {
            return res.status(403).json({
                success: false,
                message: "Company may only record consent for itself"
            });
        }

        const existingKey = await pool.query(
            `SELECT response FROM idempotency_keys WHERE key = $1`,
            [idempotencyKey]
        );

        if (existingKey.rows.length > 0) {
            return res.status(200).json({
                success: true,
                message: "Already processed",
                previousResponse: existingKey.rows[0].response
            });
        }

        const responseData = await pool.withTransaction(async (client) => {
            if (subjectType === "company") {
                const companyResult = await client.query(
                    `SELECT id FROM companies WHERE id = $1`,
                    [subjectId]
                );

                if (companyResult.rows.length === 0) {
                    const error = new Error("Company not found");
                    error.status = 404;
                    throw error;
                }
            } else {
                const candidateResult = await client.query(
                    `SELECT id FROM candidates WHERE id = $1`,
                    [subjectId]
                );

                if (candidateResult.rows.length === 0) {
                    const error = new Error("Candidate not found");
                    error.status = 404;
                    throw error;
                }
            }

            const existingConsent = await client.query(
                `
        SELECT id
        FROM consents
        WHERE subject_type = $1
          AND subject_id = $2
          AND consent_type = $3
        `,
                [subjectType, subjectId, consentType]
            );

            const consentResult = existingConsent.rows.length > 0
                ? await client.query(
                    `
            UPDATE consents
            SET granted = $1,
                expires_at = $2,
                details = $3,
                granted_at = CURRENT_TIMESTAMP
            WHERE id = $4
            RETURNING *
            `,
                    [granted, expiresAt || null, JSON.stringify(details || {}), existingConsent.rows[0].id]
                )
                : await client.query(
                    `
            INSERT INTO consents
            (
              subject_type,
              subject_id,
              consent_type,
              granted,
              expires_at,
              details
            )
            VALUES ($1,$2,$3,$4,$5,$6)
            RETURNING *
            `,
                    [subjectType, subjectId, consentType, granted, expiresAt || null, JSON.stringify(details || {})]
                );

            const responsePayload = {
                success: true,
                message: "Consent recorded",
                consent: consentResult.rows[0]
            };

            await client.query(
                `
        INSERT INTO idempotency_keys
        (
          key,
          endpoint,
          response
        )
        VALUES ($1,$2,$3)
        `,
                [
                    idempotencyKey,
                    "/api/consents",
                    JSON.stringify(responsePayload)
                ]
            );

            return responsePayload;
        });

        res.status(201).json(responseData);
    } catch (error) {
        console.error(error);
        const dbError = pool.mapDbError(error);

        res.status(dbError.status).json({
            success: false,
            message: dbError.message
        });
    }
};

const getConsentsForSubject = async (req, res) => {
    try {
        const subjectType = req.params.subjectType;
        const subjectId = Number(req.params.subjectId);

        if (!subjectType || !["company", "candidate"].includes(subjectType)) {
            return res.status(400).json({
                success: false,
                message: "Valid subject type is required"
            });
        }

        if (!subjectId) {
            return res.status(400).json({
                success: false,
                message: "Valid subject id is required"
            });
        }

        if (subjectType === "company" && subjectId !== req.user?.companyId) {
            return res.status(403).json({
                success: false,
                message: "Unauthorized request for company consent data"
            });
        }

        const result = await pool.query(
            `
      SELECT *
      FROM consents
      WHERE subject_type = $1
        AND subject_id = $2
      ORDER BY granted_at DESC
      `,
            [subjectType, subjectId]
        );

        res.status(200).json({
            success: true,
            consents: result.rows
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Unable to retrieve consents"
        });
    }
};

module.exports = {
    createConsent,
    getConsentsForSubject
};
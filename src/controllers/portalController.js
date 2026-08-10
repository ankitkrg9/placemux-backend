const pool = require("../config/db");
const {
    portalStartSchema,
    portalCompleteSchema,
    portalDryRunSchema
} = require("../validators/portalValidator");

const startPortalSession = async (req, res) => {
    try {
        const validation = portalStartSchema.safeParse(req.body);

        if (!validation.success) {
            return res.status(400).json({
                success: false,
                errors: validation.error.issues
            });
        }

        const idempotencyKey = req.headers["idempotency-key"];

        if (!idempotencyKey) {
            return res.status(400).json({
                success: false,
                message: "Idempotency-Key header required"
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

        const companyId = req.user?.companyId;
        const { portalType, candidateId, metadata } = req.body;

        const responseData = await pool.withTransaction(async (client) => {
            const companyResult = await client.query(
                `SELECT id FROM companies WHERE id = $1`,
                [companyId]
            );

            if (companyResult.rows.length === 0) {
                const error = new Error("Company not found");
                error.status = 404;
                throw error;
            }

            if (candidateId) {
                const candidateResult = await client.query(
                    `SELECT id FROM candidates WHERE id = $1`,
                    [candidateId]
                );

                if (candidateResult.rows.length === 0) {
                    const error = new Error("Candidate not found");
                    error.status = 404;
                    throw error;
                }
            }

            const result = await client.query(
                `
        INSERT INTO portal_sessions
        (
          company_id,
          candidate_id,
          portal_type,
          status,
          metadata
        )
        VALUES ($1,$2,$3,'PENDING',$4)
        RETURNING *
        `,
                [companyId, candidateId || null, portalType, JSON.stringify(metadata || {})]
            );

            const responsePayload = {
                success: true,
                message: "Portal session created",
                portalSession: result.rows[0]
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
                    "/api/portals/start",
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

const completePortalSession = async (req, res) => {
    try {
        const validation = portalCompleteSchema.safeParse(req.body);

        if (!validation.success) {
            return res.status(400).json({
                success: false,
                errors: validation.error.issues
            });
        }

        const idempotencyKey = req.headers["idempotency-key"];
        const { portalId, status, metadata } = req.body;
        const companyId = req.user?.companyId;

        if (!idempotencyKey) {
            return res.status(400).json({
                success: false,
                message: "Idempotency-Key header required"
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
            const portalResult = await client.query(
                `SELECT * FROM portal_sessions WHERE id = $1 AND company_id = $2`,
                [portalId, companyId]
            );

            if (portalResult.rows.length === 0) {
                const error = new Error("Portal session not found");
                error.status = 404;
                throw error;
            }

            const result = await client.query(
                `
        UPDATE portal_sessions
        SET status = $1,
            metadata = metadata || $2,
            completed_at = CURRENT_TIMESTAMP
        WHERE id = $3
        RETURNING *
        `,
                [status, JSON.stringify(metadata || {}), portalId]
            );

            const responsePayload = {
                success: true,
                message: "Portal session updated",
                portalSession: result.rows[0]
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
                    "/api/portals/complete",
                    JSON.stringify(responsePayload)
                ]
            );

            return responsePayload;
        });

        res.status(200).json(responseData);
    } catch (error) {
        console.error(error);
        const dbError = pool.mapDbError(error);

        res.status(dbError.status).json({
            success: false,
            message: dbError.message
        });
    }
};

const getPortalSession = async (req, res) => {
    try {
        const portalId = Number(req.params.portalId);
        const companyId = req.user?.companyId;

        if (!portalId) {
            return res.status(400).json({
                success: false,
                message: "Valid portal id is required"
            });
        }

        const result = await pool.query(
            `SELECT * FROM portal_sessions WHERE id = $1 AND company_id = $2`,
            [portalId, companyId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Portal session not found"
            });
        }

        res.status(200).json({
            success: true,
            portalSession: result.rows[0]
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Unable to fetch portal session"
        });
    }
};

const dryRunPortalSession = async (req, res) => {
    try {
        const validation = portalDryRunSchema.safeParse(req.body);

        if (!validation.success) {
            return res.status(400).json({
                success: false,
                errors: validation.error.issues
            });
        }

        const { portalType, candidateId, action } = req.body;

        const checks = [
            {
                name: "portalType",
                passed: true,
                detail: `Portal type ${portalType} is supported.`
            }
        ];

        if (candidateId) {
            const candidateResult = await pool.query(
                `SELECT id FROM candidates WHERE id = $1`,
                [candidateId]
            );

            checks.push({
                name: "candidateExists",
                passed: candidateResult.rows.length > 0,
                detail: candidateResult.rows.length > 0
                    ? "Candidate exists and can participate in the portal flow."
                    : "Candidate does not exist."
            });
        }

        res.status(200).json({
            success: true,
            preview: {
                portalType,
                candidateId: candidateId || null,
                action: action || "review",
                checks,
                next: candidateId
                    ? "Once the portal is started, the candidate can be routed into the college workflow."
                    : "Start a portal session to continue with the chosen college flow."
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Unable to run portal dry-run"
        });
    }
};

module.exports = {
    startPortalSession,
    completePortalSession,
    getPortalSession,
    dryRunPortalSession
};
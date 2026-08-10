const pool = require("../config/db");
const { rightsSubjectParamsSchema } = require("../validators/rightsValidator");

const getSubjectRights = async (req, res) => {
    try {
        const validation = rightsSubjectParamsSchema.safeParse(req.params);

        if (!validation.success) {
            return res.status(400).json({
                success: false,
                errors: validation.error.issues
            });
        }

        const { subjectType, subjectId } = validation.data;

        if (subjectType === "company" && subjectId !== req.user?.companyId) {
            return res.status(403).json({
                success: false,
                message: "Unauthorized request for company data rights"
            });
        }

        const entities = [];

        if (subjectType === "company") {
            const [company, profiles, kyc, jobs] = await Promise.all([
                pool.query("SELECT id, company_name, email FROM companies WHERE id = $1", [subjectId]),
                pool.query("SELECT id, industry, website, description, location FROM company_profiles WHERE company_id = $1", [subjectId]),
                pool.query("SELECT id, pan_number, gst_number, document_url, status FROM company_kyc WHERE company_id = $1", [subjectId]),
                pool.query("SELECT id, title, description, location, salary, created_at FROM jobs WHERE company_id = $1", [subjectId])
            ]);

            entities.push({ subject: "company", data: company.rows });
            entities.push({ subject: "company_profile", data: profiles.rows });
            entities.push({ subject: "company_kyc", data: kyc.rows });
            entities.push({ subject: "jobs", data: jobs.rows });
        } else {
            const [candidate, applications] = await Promise.all([
                pool.query("SELECT id, name, email, skills FROM candidates WHERE id = $1", [subjectId]),
                pool.query("SELECT id, job_id, candidate_id, status, applied_at FROM applications WHERE candidate_id = $1", [subjectId])
            ]);

            entities.push({ subject: "candidate", data: candidate.rows });
            entities.push({ subject: "applications", data: applications.rows });
        }

        res.status(200).json({
            success: true,
            rights: {
                subjectType,
                subjectId,
                dataSnapshot: entities,
                summary: `Collected ${entities.reduce((sum, e) => sum + e.data.length, 0)} records for ${subjectType}`
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Unable to collect subject rights data"
        });
    }
};

const eraseSubjectData = async (req, res) => {
    try {
        const validation = rightsSubjectParamsSchema.safeParse(req.params);

        if (!validation.success) {
            return res.status(400).json({
                success: false,
                errors: validation.error.issues
            });
        }

        const { subjectType, subjectId } = validation.data;

        if (subjectType === "company" && subjectId !== req.user?.companyId) {
            return res.status(403).json({
                success: false,
                message: "Unauthorized request for company data erasure"
            });
        }

        await pool.withTransaction(async (client) => {
            if (subjectType === "company") {
                await client.query("DELETE FROM companies WHERE id = $1", [subjectId]);
            } else {
                await client.query("DELETE FROM applications WHERE candidate_id = $1", [subjectId]);
                await client.query("DELETE FROM candidates WHERE id = $1", [subjectId]);
            }
        });

        res.status(200).json({
            success: true,
            message: `Data for ${subjectType} ${subjectId} erased successfully`
        });
    } catch (error) {
        console.error(error);
        const dbError = pool.mapDbError(error);

        res.status(dbError.status).json({
            success: false,
            message: dbError.message
        });
    }
};

module.exports = {
    getSubjectRights,
    eraseSubjectData
};
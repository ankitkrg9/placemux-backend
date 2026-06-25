const pool = require("../config/db");

const {
  createJobSchema
} = require("../validators/jobValidator");

const createJob = async (req, res) => {
  try {

    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized"
      });
    }

    // Validation
    const validation =
      createJobSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        errors: validation.error.issues
      });
    }

    const {
      title,
      description,
      requiredCompetencyIds,
      location,
      salary,
      skillThresholds
    } = req.body;

    const company = await pool.query(
      "SELECT * FROM companies WHERE id = $1",
      [companyId]
    );

    if (company.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Company not found"
      });
    }

    // Create job and assessment link in a single transaction
    const job = await pool.withTransaction(async (client) => {
      const result = await client.query(
        `
        INSERT INTO jobs
        (
          company_id,
          title,
          description,
          required_competency_ids,
          location,
          salary,
          skill_thresholds
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7)
        RETURNING *
        `,
        [
          companyId,
          title,
          description,
          JSON.stringify(requiredCompetencyIds),
          location,
          salary,
          JSON.stringify(skillThresholds)
        ]
      );

      const createdJob = result.rows[0];
      const assessmentLink =
        `https://placemux.com/assessment/${createdJob.id}`;

      await client.query(
        `
        UPDATE jobs
        SET assessment_link = $1
        WHERE id = $2
        `,
        [assessmentLink, createdJob.id]
      );

      createdJob.assessment_link = assessmentLink;
      return createdJob;
    });

    res.status(201).json({
      success: true,
      message: "Job created successfully",
      job
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
  createJob
};
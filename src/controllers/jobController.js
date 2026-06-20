const pool = require("../config/db");

const {
  createJobSchema
} = require("../validators/jobValidator");

const createJob = async (req, res) => {
  try {

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
      companyId,
      title,
      description,
      requiredCompetencyIds,
      location,
      salary,
      skillThresholds
    } = req.body;

    // Check Company Exists
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

    // Create Job
    const result = await pool.query(
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

    const job = result.rows[0];

    // Generate Assessment Link
    const assessmentLink =
      `https://placemux.com/assessment/${job.id}`;

    await pool.query(
      `
      UPDATE jobs
      SET assessment_link = $1
      WHERE id = $2
      `,
      [assessmentLink, job.id]
    );

    job.assessment_link = assessmentLink;

    res.status(201).json({
      success: true,
      message: "Job created successfully",
      job
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  createJob
};
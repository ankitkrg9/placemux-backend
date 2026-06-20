const pool = require("../config/db");

const {
  applicationSchema
} = require("../validators/applicationValidator");

const applyJob = async (req, res) => {
  try {
    // Zod Validation
    const validation =
      applicationSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        errors: validation.error.issues
      });
    }

    const {
      candidateId,
      jobId
    } = req.body;

    // Check Candidate
    const candidateResult = await pool.query(
      "SELECT * FROM candidates WHERE id = $1",
      [candidateId]
    );

    // Check Job
    const jobResult = await pool.query(
      "SELECT * FROM jobs WHERE id = $1",
      [jobId]
    );

    if (
      candidateResult.rows.length === 0 ||
      jobResult.rows.length === 0
    ) {
      return res.status(404).json({
        success: false,
        message: "Candidate or Job not found"
      });
    }

    // Duplicate Application Check
    const existingApplication = await pool.query(
      `
      SELECT *
      FROM applications
      WHERE candidate_id = $1
      AND job_id = $2
      `,
      [candidateId, jobId]
    );

    if (existingApplication.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Candidate has already applied for this job"
      });
    }

    const candidateSkills =
  candidateResult.rows[0].skills || [];

const skillThresholds =
  jobResult.rows[0].skillthresholds || [];

const meetsThreshold =
  skillThresholds.every(requiredSkill => {

    const candidateSkill =
      candidateSkills.find(
        skill =>
          skill.competencyId ===
          requiredSkill.competencyId
      );

    if (!candidateSkill) {
      return false;
    }

    return (
      candidateSkill.level >=
      requiredSkill.minimumLevel
    );
  });

    const status = meetsThreshold
      ? "APPLIED"
      : "REJECTED_THRESHOLD";

    const result = await pool.query(
      `
      INSERT INTO applications
      (
        job_id,
        candidate_id,
        status
      )
      VALUES ($1,$2,$3)
      RETURNING *
      `,
      [
        jobId,
        candidateId,
        status
      ]
    );

    res.status(201).json({
      success: true,
      application: result.rows[0],
      thresholdPassed: meetsThreshold,
      message: meetsThreshold
        ? "Application submitted successfully"
        : "Candidate rejected due to skill threshold"
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
  applyJob
};
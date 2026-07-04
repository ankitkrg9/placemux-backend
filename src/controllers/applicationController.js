const pool = require("../config/db");
const { backgroundQueue } = require("../services/backgroundQueue");
const { invalidateAnalyticsCache } = require("../services/analyticsService");

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

    const result = await pool.withTransaction(async (client) => {
      const existingApplication = await client.query(
        `
        SELECT *
        FROM applications
        WHERE candidate_id = $1
        AND job_id = $2
        `,
        [candidateId, jobId]
      );

      if (existingApplication.rows.length > 0) {
        const error = new Error(
          "Candidate has already applied for this job"
        );
        error.status = 400;
        throw error;
      }

      return client.query(
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
    });

    const backgroundJob = await backgroundQueue.enqueueJob({
      type: "application-processing",
      payload: {
        applicationId: result.rows[0].id,
        candidateId,
        jobId
      },
      idempotencyKey: `application:${candidateId}:${jobId}`
    });

    invalidateAnalyticsCache();

    res.status(201).json({
      success: true,
      application: result.rows[0],
      thresholdPassed: meetsThreshold,
      backgroundJob: {
        id: backgroundJob.id,
        status: backgroundJob.status,
        type: backgroundJob.type
      },
      message: meetsThreshold
        ? "Application submitted successfully"
        : "Candidate rejected due to skill threshold"
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
  applyJob
};
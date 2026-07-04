const pool = require("../config/db");
const { invalidateAnalyticsCache } = require("../services/analyticsService");

const {
  createCandidateSchema
} = require("../validators/candidateValidator");

const createCandidate = async (req, res) => {
  try {

    const validation =
      createCandidateSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        errors: validation.error.issues
      });
    }

    const {
      name,
      email,
      skills
    } = req.body;

    const result = await pool.query(
      `
      INSERT INTO candidates
      (
        name,
        email,
        skills
      )
      VALUES ($1,$2,$3)
      RETURNING *
      `,
      [
        name,
        email,
        JSON.stringify(skills)
      ]
    );

    invalidateAnalyticsCache();

    res.status(201).json({
      success: true,
      candidate: result.rows[0]
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
  createCandidate
};
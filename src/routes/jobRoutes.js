const express = require("express");

const router = express.Router();

const { authenticateToken } = require("../middleware/authMiddleware");
const {
  createJob
} = require("../controllers/jobController");

/**
 * @swagger
 * tags:
 *   name: Jobs
 *   description: Job Management APIs
 */

/**
 * @swagger
 * /api/jobs:
 *   post:
 *     summary: Create a new job
 *     description: Create a new job posting for the authenticated company.
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Job created successfully.
 *       400:
 *         description: Invalid request.
 *       401:
 *         description: Unauthorized.
 *       500:
 *         description: Internal server error.
 */
router.post("/", authenticateToken, createJob);

module.exports = router;
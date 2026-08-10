const express = require("express");

const router = express.Router();

const {
  applyJob
} = require("../controllers/applicationController");
const { authenticateToken } = require("../middleware/authMiddleware");
const { backgroundQueue } = require("../services/backgroundQueue");

/**
 * @swagger
 * tags:
 *   name: Applications
 *   description: Job Application APIs
 */

/**
 * @swagger
 * /api/applications:
 *   post:
 *     summary: Apply for a job
 *     description: Submit a job application for an authenticated candidate.
 *     tags: [Applications]
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
 *         description: Application submitted successfully.
 *       400:
 *         description: Invalid request.
 *       401:
 *         description: Unauthorized.
 *       500:
 *         description: Internal server error.
 */
router.post("/", authenticateToken, applyJob);

/**
 * @swagger
 * /api/applications/queue/stats:
 *   get:
 *     summary: Get background queue statistics
 *     description: Returns statistics of the background processing queue.
 *     tags: [Applications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Queue statistics retrieved successfully.
 *       401:
 *         description: Unauthorized.
 */
router.get("/queue/stats", authenticateToken, (req, res) => {
  res.json({
    success: true,
    stats: backgroundQueue.getStats()
  });
});

module.exports = router;
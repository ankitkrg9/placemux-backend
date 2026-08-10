const express = require("express");

const router = express.Router();

const { getBaselineReportHandler } = require("../controllers/analyticsController");
const { authenticateToken } = require("../middleware/authMiddleware");

/**
 * @swagger
 * tags:
 *   name: Analytics
 *   description: Analytics & Reporting APIs
 */

/**
 * @swagger
 * /api/analytics/baseline:
 *   get:
 *     summary: Get baseline analytics report
 *     description: Returns the baseline analytics report for the authenticated company.
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Analytics report retrieved successfully.
 *       401:
 *         description: Unauthorized.
 *       500:
 *         description: Internal server error.
 */
router.get("/baseline", authenticateToken, getBaselineReportHandler);

module.exports = router;
const express = require("express");
const router = express.Router();
const { getMetrics } = require("../services/observabilityService");
const metricsService = require("../services/metricsService");
const pool = require("../config/db");
const { authenticateToken } = require("../middleware/authMiddleware");

/**
 * @swagger
 * tags:
 *   name: Observability
 *   description: Metrics and health APIs
 */

router.get("/metrics", authenticateToken, (req, res) => {
    const dbStats = {
        total: pool && typeof pool.totalCount === 'number' ? pool.totalCount : 0,
        idle: pool && typeof pool.idleCount === 'number' ? pool.idleCount : 0,
        waiting: pool && typeof pool.waitingCount === 'number' ? pool.waitingCount : 0,
        max: (pool && pool.options && pool.options.max) || Number(process.env.DB_POOL_MAX || 12)
    };

    res.status(200).json({
        success: true,
        metrics: getMetrics(),
        counters: metricsService.snapshot(),
        db: dbStats
    });
});

module.exports = router;

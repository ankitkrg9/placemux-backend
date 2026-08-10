const express = require("express");
const router = express.Router();
const {
    initiatePayment,
    handleWebhook,
    getPaymentReconciliation
} = require("../controllers/paymentController");
const rateLimit = require("express-rate-limit");
const metrics = require("../services/metricsService");

const paymentLimiter = rateLimit({
    windowMs: Number(process.env.PAYMENT_RATE_WINDOW_MS || 60 * 1000),
    max: Number(process.env.PAYMENT_RATE_MAX || 20),
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        metrics.increment("payments.rejected_rate_limit");
        res.setHeader("Retry-After", "60");
        res.status(429).json({ success: false, message: "Too many requests to payments endpoint" });
    }
});
const { authenticateToken } = require("../middleware/authMiddleware");
const overloadGuard = require("../middleware/overloadGuard");

/**
 * @swagger
 * tags:
 *   name: Payments
 *   description: Payment rehearsal and reconciliation APIs
 */

router.post("/initiate", authenticateToken, overloadGuard, paymentLimiter, initiatePayment);
router.post("/webhook", handleWebhook);
router.get("/reconciliation", authenticateToken, getPaymentReconciliation);

module.exports = router;

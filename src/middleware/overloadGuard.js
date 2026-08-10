const pool = require("../config/db");
const metrics = require("../services/metricsService");

const WAITING_THRESHOLD = Number(process.env.DB_WAITING_THRESHOLD || 10);

module.exports = (req, res, next) => {
    try {
        const waiting = typeof pool.waitingCount === "number" ? pool.waitingCount : 0;
        const total = typeof pool.totalCount === "number" ? pool.totalCount : 0;
        const max = (pool.options && pool.options.max) || Number(process.env.DB_POOL_MAX || 12);

        if (waiting >= WAITING_THRESHOLD || (total >= max && waiting > 0)) {
            metrics.increment("overload.db_rejected");
            res.setHeader("Retry-After", "10");
            return res.status(503).json({ success: false, message: "Service temporarily overloaded, try again later" });
        }
    } catch (e) {
        // don't block requests on monitoring errors
    }

    return next();
};

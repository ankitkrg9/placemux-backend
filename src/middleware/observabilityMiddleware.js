const { recordRequest } = require("../services/observabilityService");

const observabilityMiddleware = (req, res, next) => {
    const start = process.hrtime.bigint();

    res.on("finish", () => {
        const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
        recordRequest(req.path, durationMs, res.statusCode);
    });

    next();
};

module.exports = {
    observabilityMiddleware
};

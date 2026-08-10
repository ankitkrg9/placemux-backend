const metrics = {
    requestCount: 0,
    errorCount: 0,
    totalLatencyMs: 0,
    routes: {}
};

const recordRequest = (route, durationMs, statusCode) => {
    metrics.requestCount += 1;
    metrics.totalLatencyMs += durationMs;

    if (!metrics.routes[route]) {
        metrics.routes[route] = {
            count: 0,
            totalLatencyMs: 0,
            errors: 0
        };
    }

    metrics.routes[route].count += 1;
    metrics.routes[route].totalLatencyMs += durationMs;

    if (statusCode >= 500) {
        metrics.errorCount += 1;
        metrics.routes[route].errors += 1;
    }
};

const recordError = () => {
    metrics.errorCount += 1;
};

const getMetrics = () => {
    const averageLatencyMs = metrics.requestCount
        ? Number((metrics.totalLatencyMs / metrics.requestCount).toFixed(2))
        : 0;

    return {
        requestCount: metrics.requestCount,
        errorCount: metrics.errorCount,
        averageLatencyMs,
        routes: Object.entries(metrics.routes).map(([route, data]) => ({
            route,
            count: data.count,
            averageLatencyMs: Number((data.totalLatencyMs / data.count).toFixed(2)),
            errorCount: data.errors
        }))
    };
};

module.exports = {
    recordRequest,
    recordError,
    getMetrics
};

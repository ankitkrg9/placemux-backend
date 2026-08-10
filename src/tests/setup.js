require("dotenv").config({ path: ".env.test" });

beforeAll(async () => {
    console.log("Starting integration tests...");
});

afterAll(async () => {
    console.log("Integration tests completed.");

    // Attempt clean shutdown of background workers and DB pool
    try {
        const bg = require("../services/backgroundQueue");
        if (bg && typeof bg.stopBackgroundWorker === "function") {
            bg.stopBackgroundWorker();
        }
    } catch (e) { }

    try {
        const outboxPub = require("../services/outboxPublisher");
        if (outboxPub && typeof outboxPub.stopOutboxPublisher === "function") {
            outboxPub.stopOutboxPublisher();
        }
    } catch (e) { }
});

// Ensure background workers and DB pool are closed when the Node process exits
process.once("beforeExit", () => {
    try {
        require("../services/analyticsService").shutdownAnalyticsService().catch(() => { });
    } catch (e) { }

    try {
        const pool = require("../config/db");
        if (pool && typeof pool.end === "function") {
            pool.end().catch(() => { });
        }
    } catch (e) { }
});

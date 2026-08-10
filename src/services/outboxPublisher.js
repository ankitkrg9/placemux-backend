const outbox = require("./outboxService");

let publisherTimer = null;
let isPublishing = false;

const metrics = require("./metricsService");

const defaultProcessor = async (event) => {
    // Placeholder publish: log and pretend to publish
    console.log("[outbox-publish]", event.event_type, event.id);
    return true;
};

const initializeOutboxPublisher = ({ intervalMs = Number(process.env.OUTBOX_PUBLISH_INTERVAL_MS || 2000), batchSize = Number(process.env.OUTBOX_PUBLISH_BATCH || 50), processor = defaultProcessor } = {}) => {
    if (publisherTimer) return;

    publisherTimer = setInterval(async () => {
        if (isPublishing) return;
        isPublishing = true;

        try {
            const events = await outbox.fetchUnpublished(batchSize);
            if (!events || events.length === 0) return;

            const publishedIds = [];
            for (const evt of events) {
                try {
                    const ok = await processor(evt);
                    if (ok) {
                        publishedIds.push(evt.id);
                        metrics.increment("outbox.published");
                    } else {
                        await outbox.incrementAttempt(evt.id);
                    }
                } catch (err) {
                    // mark attempt and possibly move to deadletter
                    await outbox.incrementAttempt(evt.id);
                    const maxAttempts = Number(process.env.OUTBOX_MAX_ATTEMPTS || 3);
                    if ((evt.attempts || 0) + 1 >= maxAttempts) {
                        await outbox.moveToDeadLetter(evt, err.message || String(err));
                        metrics.increment("outbox.deadletter");
                    } else {
                        metrics.increment("outbox.attempt_failed");
                    }
                }
            }

            if (publishedIds.length) {
                await outbox.markPublished(publishedIds);
            }
        } catch (err) {
            console.error("Outbox publisher failed", err);
        } finally {
            isPublishing = false;
        }
    }, intervalMs);

    return {
        stop: () => {
            if (publisherTimer) {
                clearInterval(publisherTimer);
                publisherTimer = null;
            }
        }
    };
};

const stopOutboxPublisher = () => {
    if (publisherTimer) {
        clearInterval(publisherTimer);
        publisherTimer = null;
    }
};

module.exports = {
    initializeOutboxPublisher,
    stopOutboxPublisher
};

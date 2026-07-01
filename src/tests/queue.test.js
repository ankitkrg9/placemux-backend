const { createBackgroundQueue } = require("../services/backgroundQueue");

describe("Background queue", () => {
  it("retries transient failures, then moves permanent failures to dead-letter", async () => {
    const queue = createBackgroundQueue();
    const processor = jest
      .fn()
      .mockRejectedValueOnce(new Error("temporary failure"))
      .mockRejectedValueOnce(new Error("temporary failure"))
      .mockResolvedValueOnce({ ok: true, attempt: 3 });

    const job = await queue.enqueueJob({
      type: "application-notification",
      payload: { applicationId: 44 },
      idempotencyKey: "job-1"
    });

    await queue.processAll({
      processor,
      maxAttempts: 3,
      retryDelayMs: 0
    });

    expect(job.status).toBe("completed");
    expect(processor).toHaveBeenCalledTimes(3);

    const stats = queue.getStats();
    expect(stats.completed).toBe(1);
    expect(stats.failed).toBe(0);
    expect(stats.deadLettered).toBe(0);
  });

  it("prevents duplicate jobs for the same idempotency key", async () => {
    const queue = createBackgroundQueue();

    const first = await queue.enqueueJob({
      type: "application-notification",
      payload: { applicationId: 10 },
      idempotencyKey: "duplicate-key"
    });

    const second = await queue.enqueueJob({
      type: "application-notification",
      payload: { applicationId: 11 },
      idempotencyKey: "duplicate-key"
    });

    expect(first.id).toBe(second.id);
    expect(first.status).toBe("queued");
    expect(second.status).toBe("queued");
    expect(queue.getStats().queued).toBe(1);
  });

  it("dead-letters jobs after max attempts are exhausted", async () => {
    const queue = createBackgroundQueue();
    const processor = jest.fn().mockRejectedValue(new Error("still broken"));

    await queue.enqueueJob({
      type: "application-notification",
      payload: { applicationId: 77 },
      idempotencyKey: "job-2"
    });

    await queue.processAll({
      processor,
      maxAttempts: 2,
      retryDelayMs: 0
    });

    const stats = queue.getStats();
    expect(stats.deadLettered).toBe(1);
    expect(stats.failed).toBe(1);
    expect(processor).toHaveBeenCalledTimes(2);
  });
});

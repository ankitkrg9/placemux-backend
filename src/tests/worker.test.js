const { createWorkerPool } = require("../services/workerPool");

describe("Worker pool", () => {
  let pool;

  afterEach(async () => {
    if (pool) {
      await pool.terminate();
      pool = null;
    }
  });

  it("executes CPU-bound tasks through the worker pool", async () => {
    pool = createWorkerPool({ size: 1 });

    const result = await pool.enqueue({
      payload: {
        values: [1, 2, 3, 4],
        iterations: 2
      }
    });

    expect(typeof result).toBe("number");
    expect(result).toBeGreaterThan(0);
  });
});

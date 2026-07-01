const pool = require("../config/db");

class BackgroundQueue {
  constructor() {
    this.jobs = [];
    this.deadLetter = [];
    this.stats = {
      queued: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      deadLettered: 0
    };
    this.idempotencyIndex = new Map();
  }

  async enqueueJob({ type, payload, idempotencyKey }) {
    if (idempotencyKey && this.idempotencyIndex.has(idempotencyKey)) {
      return this.idempotencyIndex.get(idempotencyKey);
    }

    const job = {
      id: this.jobs.length + 1,
      type,
      payload,
      idempotencyKey,
      status: "queued",
      attempts: 0,
      lastError: null,
      createdAt: new Date().toISOString()
    };

    this.jobs.push(job);
    this.stats.queued += 1;

    if (idempotencyKey) {
      this.idempotencyIndex.set(idempotencyKey, job);
    }

    return job;
  }

  async processAll({ processor, maxAttempts = 3, retryDelayMs = 1000 }) {
    let pendingJobs = this.jobs.filter((job) => job.status === "queued");

    while (pendingJobs.length > 0) {
      const currentJobs = [...pendingJobs];
      pendingJobs = [];

      for (const job of currentJobs) {
        this.stats.processing += 1;
        this.stats.queued -= 1;
        job.status = "processing";

        try {
          await processor(job);
          job.status = "completed";
          this.stats.completed += 1;
        } catch (error) {
          job.attempts += 1;
          job.lastError = error.message;

          if (job.attempts >= maxAttempts) {
            job.status = "dead-letter";
            this.deadLetter.push(job);
            this.stats.deadLettered += 1;
            this.stats.failed += 1;
          } else {
            job.status = "queued";
            this.stats.queued += 1;
            pendingJobs.push(job);
            if (retryDelayMs > 0) {
              await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
            }
          }
        } finally {
          this.stats.processing -= 1;
        }
      }
    }

    return this.jobs;
  }

  getStats() {
    return { ...this.stats, deadLetter: this.deadLetter.length };
  }
}

const createBackgroundQueue = () => new BackgroundQueue();
const backgroundQueue = createBackgroundQueue();

const createApplicationJobProcessor = () => async (job) => {
  const { applicationId } = job.payload;

  if (!applicationId) {
    throw new Error("Application id is required for background processing");
  }

  const result = await pool.query(
    "SELECT id, job_id, candidate_id, status FROM applications WHERE id = $1",
    [applicationId]
  );

  if (result.rows.length === 0) {
    throw new Error(`Application ${applicationId} was not found`);
  }

  await new Promise((resolve) => setTimeout(resolve, 35));

  return {
    applicationId,
    processedAt: new Date().toISOString(),
    status: result.rows[0].status
  };
};

let workerTimer = null;
let isWorkerRunning = false;

const initializeBackgroundWorker = ({
  processor = createApplicationJobProcessor(),
  intervalMs = 1500,
  maxAttempts = 3,
  retryDelayMs = 500
} = {}) => {
  if (workerTimer) {
    return backgroundQueue;
  }

  workerTimer = setInterval(() => {
    if (isWorkerRunning) {
      return;
    }

    isWorkerRunning = true;
    backgroundQueue
      .processAll({ processor, maxAttempts, retryDelayMs })
      .catch((error) => {
        console.error("Background worker failed", error);
      })
      .finally(() => {
        isWorkerRunning = false;
      });
  }, intervalMs);

  return backgroundQueue;
};

const stopBackgroundWorker = () => {
  if (workerTimer) {
    clearInterval(workerTimer);
    workerTimer = null;
  }
};

module.exports = {
  BackgroundQueue,
  createBackgroundQueue,
  backgroundQueue,
  createApplicationJobProcessor,
  initializeBackgroundWorker,
  stopBackgroundWorker
};

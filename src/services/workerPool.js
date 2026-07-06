const { Worker } = require("worker_threads");
const path = require("path");

class WorkerPool {
  constructor({ size = Math.max(1, require("os").cpus().length - 1) } = {}) {
    this.size = size;
    this.workers = [];
    this.availableWorkers = [];
    this.taskQueue = [];
    this.pendingTasks = new Map();
    this.init();
  }

  init() {
    for (let index = 0; index < this.size; index += 1) {
      this.createWorker();
    }
  }

  createWorker() {
    const worker = new Worker(path.resolve(__dirname, "workerThreadTask.js"));
    this.workers.push(worker);
    this.availableWorkers.push(worker);

    worker.on("message", (message) => {
      const { taskId, result, error } = message;
      const pendingTask = this.pendingTasks.get(taskId);
      if (!pendingTask) {
        return;
      }

      this.pendingTasks.delete(taskId);
      this.availableWorkers.push(worker);
      if (error) {
        pendingTask.reject(error);
      } else {
        pendingTask.resolve(result);
      }
      this.runNext();
    });

    worker.on("error", (error) => {
      const pendingTasks = Array.from(this.pendingTasks.values());
      const pendingTask = pendingTasks[0];
      if (pendingTask) {
        pendingTask.reject(error);
      }
    });
  }

  runNext() {
    if (!this.taskQueue.length || !this.availableWorkers.length) {
      return;
    }

    const worker = this.availableWorkers.shift();
    const task = this.taskQueue.shift();
    if (!worker || !task) {
      return;
    }

    const taskPayload = {
      id: task.id,
      payload: task.payload
    };

    this.pendingTasks.set(task.id, task);
    worker.postMessage(taskPayload);
  }

  enqueue(task) {
    return new Promise((resolve, reject) => {
      const taskWithId = {
        ...task,
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`
      };
      this.taskQueue.push({ ...taskWithId, resolve, reject });
      this.runNext();
    });
  }

  async terminate() {
    const workers = [...this.workers];
    this.taskQueue = [];
    this.pendingTasks.clear();
    await Promise.all(workers.map((worker) => worker.terminate()));
    this.workers = [];
    this.availableWorkers = [];
  }
}

const createWorkerPool = (options = {}) => new WorkerPool(options);

module.exports = {
  WorkerPool,
  createWorkerPool
};

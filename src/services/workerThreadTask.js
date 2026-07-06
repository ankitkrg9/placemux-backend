const { parentPort } = require("worker_threads");

const calculateHeavyMetric = (input) => {
  const { values = [], iterations = 1 } = input || {};
  let total = 0;

  for (let iteration = 0; iteration < iterations; iteration += 1) {
    for (const value of values) {
      let running = value;
      for (let index = 0; index < 200; index += 1) {
        running = ((running * 31) % 97) + (index % 13);
      }
      total += running;
    }
  }

  return total;
};

parentPort.on("message", (task) => {
  try {
    const result = calculateHeavyMetric(task.payload);
    parentPort.postMessage({ taskId: task.id, result });
  } catch (error) {
    parentPort.postMessage({ taskId: task.id, error: error.message });
  }
});

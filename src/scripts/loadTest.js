const autocannon = require("autocannon");

const target = process.env.LOAD_TEST_TARGET || "http://localhost:3000/api/payments/initiate";
const connections = Number(process.env.LOAD_TEST_CONNECTIONS || 50);
const duration = Number(process.env.LOAD_TEST_DURATION || 15);

console.log(`Running load test against ${target} with ${connections} connections for ${duration}s`);

autocannon(
  {
    url: target,
    connections,
    duration,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": `loadtest-${Date.now()}`
    },
    body: JSON.stringify({ referenceId: `loadtest-${Date.now()}`, amount: 100, currency: "INR" })
  },
  (err, result) => {
    if (err) {
      console.error("Load test failed", err);
      process.exit(1);
    }

    console.log("Load test complete");
    console.log(result);
    process.exit(0);
  }
);
const http = require("http");

const mode = (process.env.LOAD_TEST_MODE || "load").toLowerCase();
const targetUrl = process.env.LOAD_TEST_URL || `http://127.0.0.1:${process.env.PORT || 5000}/`;
const concurrency = Number(process.env.LOAD_TEST_CONCURRENCY || (mode === "stress" ? 50 : mode === "soak" ? 10 : 20));
const totalRequests = Number(process.env.LOAD_TEST_TOTAL_REQUESTS || (mode === "stress" ? 400 : mode === "soak" ? 600 : 200));
const durationMs = Number(process.env.LOAD_TEST_DURATION_MS || 30_000);
const timeoutMs = Number(process.env.LOAD_TEST_TIMEOUT_MS || 4000);

const latencies = [];
let completed = 0;
let inFlight = 0;
let errors = 0;
let completedSummary = false;

const percentile = (values, pct) => {
  if (!values.length) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((pct / 100) * sorted.length) - 1));
  return sorted[index];
};

const printSummary = () => {
  if (completedSummary) {
    return;
  }

  completedSummary = true;
  const total = latencies.length;
  const successRate = total === 0 ? 0 : (total / (total + errors)) * 100;
  const average = total === 0 ? 0 : latencies.reduce((sum, value) => sum + value, 0) / total;
  const p95 = percentile(latencies, 95);
  const p99 = percentile(latencies, 99);
  const max = total === 0 ? 0 : Math.max(...latencies);
  const min = total === 0 ? 0 : Math.min(...latencies);

  console.log(JSON.stringify({
    mode,
    targetUrl,
    concurrency,
    totalRequests: mode === "soak" ? "duration-based" : totalRequests,
    completedRequests: total,
    errors,
    successRate: Number(successRate.toFixed(2)),
    averageLatencyMs: Number(average.toFixed(2)),
    p95LatencyMs: p95,
    p99LatencyMs: p99,
    minLatencyMs: min,
    maxLatencyMs: max,
    durationMs: mode === "soak" ? durationMs : undefined
  }, null, 2));
};

const finishRequest = (duration, hadError = false) => {
  inFlight -= 1;
  if (!hadError) {
    latencies.push(duration);
  } else {
    errors += 1;
  }
  completed += 1;

  if (mode === "soak") {
    const shouldContinue = Date.now() < startTime + durationMs;
    if (!shouldContinue && inFlight === 0) {
      printSummary();
      return;
    }
  } else if (completed >= totalRequests) {
    printSummary();
    return;
  }

  dispatchLoop();
};

const dispatchLoop = () => {
  if (mode === "soak") {
    if (Date.now() >= startTime + durationMs) {
      if (inFlight === 0) {
        printSummary();
      }
      return;
    }
  } else if (completed >= totalRequests) {
    if (inFlight === 0) {
      printSummary();
    }
    return;
  }

  while (inFlight < concurrency) {
    if (mode === "soak") {
      if (Date.now() >= startTime + durationMs) {
        break;
      }
    } else if (completed >= totalRequests) {
      break;
    }

    sendRequest();
  }
};

const sendRequest = () => {
  const startedAt = Date.now();
  inFlight += 1;

  const req = http.get(targetUrl, (res) => {
    res.setEncoding("utf8");
    let body = "";
    res.on("data", (chunk) => {
      body += chunk;
    });
    res.on("end", () => {
      const duration = Date.now() - startedAt;
      const hadError = res.statusCode >= 400 || !body;
      finishRequest(duration, hadError);
    });
  });

  req.setTimeout(timeoutMs, () => {
    req.destroy(new Error(`timeout after ${timeoutMs}ms`));
  });

  req.on("error", () => {
    finishRequest(Date.now() - startedAt, true);
  });
};

const startTime = Date.now();
dispatchLoop();

setInterval(() => {
  if (!completedSummary) {
    dispatchLoop();
  }
}, 50);

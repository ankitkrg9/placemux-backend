require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const http = require("http");

const authRoutes = require("./routes/authRoutes");
const companyRoutes = require("./routes/companyRoutes");
const jobRoutes = require("./routes/jobRoutes");
const candidateRoutes = require("./routes/candidateRoutes");
const applicationRoutes = require("./routes/applicationRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const { initializeSchema } = require("./config/schema");
const { initializeSocket } = require("./socket/socketManager");
const { initializeBackgroundWorker } = require("./services/backgroundQueue");
const { createRateLimiter, createCorsMiddleware, createInMemoryStore } = require("./services/rateLimitService");

const app = express();
const server = http.createServer(app);

const rateLimitStore = createInMemoryStore();
const apiLimiter = createRateLimiter({
  store: rateLimitStore,
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
  maxRequests: Number(process.env.RATE_LIMIT_MAX || 200),
  abuseThreshold: Number(process.env.RATE_LIMIT_ABUSE_THRESHOLD || 5),
  blockDurationMs: Number(process.env.RATE_LIMIT_BLOCK_DURATION_MS || 15 * 60 * 1000),
  keyGenerator: (req) => req.ip || req.headers["x-forwarded-for"] || "unknown"
});

const corsMiddleware = createCorsMiddleware({
  allowedOrigins: (process.env.CORS_ALLOWED_ORIGINS || "https://app.example.com").split(",").map((origin) => origin.trim()).filter(Boolean)
});

const overloadGuard = (req, res, next) => {
  if (process.env.NODE_ENV === "test") {
    return next();
  }

  const pendingRequests = app.locals.pendingRequests || 0;
  const maxPendingRequests = Number(process.env.MAX_PENDING_REQUESTS || 200);

  if (pendingRequests >= maxPendingRequests) {
    return res.status(503).json({
      success: false,
      message: "Service temporarily overloaded, please retry shortly"
    });
  }

  app.locals.pendingRequests = pendingRequests + 1;
  res.on("finish", () => {
    app.locals.pendingRequests = Math.max(0, (app.locals.pendingRequests || 1) - 1);
  });
  res.on("close", () => {
    app.locals.pendingRequests = Math.max(0, (app.locals.pendingRequests || 1) - 1);
  });

  return next();
};

app.locals.pendingRequests = 0;

app.use(helmet());
app.use(corsMiddleware);
app.use(express.json());
app.use(overloadGuard);
app.use(apiLimiter);

app.use("/api/auth", authRoutes);
app.use("/api/company", companyRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/candidates", candidateRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/analytics", analyticsRoutes);

app.get("/health", async (req, res) => {
  try {
    await initializeSchema();
    res.json({ success: true, message: "Schema ready" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get("/", (req, res) => {
  res.send("PlaceMux API Running");
});

initializeSocket(server);

if (process.env.NODE_ENV !== "test") {
  initializeBackgroundWorker();
}

module.exports = { app, server };
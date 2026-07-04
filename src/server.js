require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
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

const app = express();
const server = http.createServer(app);

const apiLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
  max: Number(process.env.RATE_LIMIT_MAX || 200),
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV === "test",
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: "Too many requests from this IP, please try again later"
    });
  }
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
app.use(cors());
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
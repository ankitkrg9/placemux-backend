const DEFAULT_WINDOW_MS = 15 * 60 * 1000;
const DEFAULT_MAX_REQUESTS = 200;
const DEFAULT_ABUSE_THRESHOLD = 5;
const DEFAULT_BLOCK_DURATION_MS = 15 * 60 * 1000;

const createInMemoryStore = () => {
  const buckets = new Map();

  return {
    get(key) {
      return buckets.get(key) || null;
    },
    set(key, value) {
      buckets.set(key, value);
    },
    delete(key) {
      buckets.delete(key);
    },
    reset() {
      buckets.clear();
    }
  };
};

const createRateLimiter = ({
  store = createInMemoryStore(),
  windowMs = DEFAULT_WINDOW_MS,
  maxRequests = DEFAULT_MAX_REQUESTS,
  abuseThreshold = DEFAULT_ABUSE_THRESHOLD,
  blockDurationMs = DEFAULT_BLOCK_DURATION_MS,
  keyGenerator = (req) => req.ip || "unknown"
} = {}) => {
  return (req, res, next) => {
    const key = keyGenerator(req);
    const now = Date.now();
    const state = store.get(key);

    if (state?.blockedUntil && state.blockedUntil > now) {
      res.status(403).json({
        success: false,
        message: "Client temporarily blocked due to abusive activity"
      });
      return;
    }

    if (state?.blockedUntil && state.blockedUntil <= now) {
      store.delete(key);
    }

    const current = state || { count: 0, windowStart: now, violations: 0 };
    const elapsed = now - current.windowStart;

    if (elapsed >= windowMs) {
      current.count = 0;
      current.windowStart = now;
    }

    current.count += 1;

    if (current.count > maxRequests) {
      current.violations = (current.violations || 0) + 1;
      if (current.violations >= abuseThreshold) {
        current.blockedUntil = now + blockDurationMs;
        store.set(key, current);
        res.status(403).json({
          success: false,
          message: "Client temporarily blocked due to abusive activity"
        });
        return;
      }

      store.set(key, current);
      res.status(429).json({
        success: false,
        message: "Too many requests, please slow down"
      });
      return;
    }

    store.set(key, current);
    next();
  };
};

const createCorsMiddleware = ({
  allowedOrigins = [],
  allowedMethods = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders = ["Content-Type", "Authorization", "Idempotency-Key"]
} = {}) => {
  const normalizedOrigins = new Set(allowedOrigins);

  return (req, res, next) => {
    const origin = req.headers?.origin;

    if (!origin) {
      return next();
    }

    if (!normalizedOrigins.has(origin)) {
      res.status(403).json({
        success: false,
        message: "Origin not allowed"
      });
      return;
    }

    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("access-control-allow-origin", origin);
    res.setHeader("Access-Control-Allow-Methods", allowedMethods.join(", "));
    res.setHeader("access-control-allow-methods", allowedMethods.join(", "));
    res.setHeader("Access-Control-Allow-Headers", allowedHeaders.join(", "));
    res.setHeader("access-control-allow-headers", allowedHeaders.join(", "));
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("access-control-allow-credentials", "true");

    if (req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }

    return next();
  };
};

module.exports = {
  createInMemoryStore,
  createRateLimiter,
  createCorsMiddleware,
  DEFAULT_WINDOW_MS,
  DEFAULT_MAX_REQUESTS,
  DEFAULT_ABUSE_THRESHOLD,
  DEFAULT_BLOCK_DURATION_MS
};

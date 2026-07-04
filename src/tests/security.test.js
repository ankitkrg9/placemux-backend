const { createRateLimiter, createCorsMiddleware, createInMemoryStore } = require("../services/rateLimitService");

describe("API security middleware", () => {
  it("blocks requests after the configured rate limit is exceeded", () => {
    const store = createInMemoryStore();
    const limiter = createRateLimiter({
      store,
      windowMs: 60_000,
      maxRequests: 2,
      keyGenerator: (req) => req.ip
    });

    const req = { ip: "203.0.113.10" };
    const res = createMockResponse();
    const next = jest.fn();

    limiter(req, res, next);
    limiter(req, res, next);
    limiter(req, res, next);

    expect(next).toHaveBeenCalledTimes(2);
    expect(res.statusCode).toBe(429);
    expect(res.body.message).toContain("Too many requests");
  });

  it("allows configured origins and rejects unapproved ones", () => {
    const cors = createCorsMiddleware({
      allowedOrigins: ["https://app.example.com"]
    });

    const allowedReq = { headers: { origin: "https://app.example.com" } };
    const allowedRes = createMockResponse();
    const allowedNext = jest.fn();
    cors(allowedReq, allowedRes, allowedNext);

    expect(allowedRes.headers["access-control-allow-origin"]).toBe("https://app.example.com");
    expect(allowedNext).toHaveBeenCalledTimes(1);

    const rejectedReq = { headers: { origin: "https://evil.example" } };
    const rejectedRes = createMockResponse();
    const rejectedNext = jest.fn();
    cors(rejectedReq, rejectedRes, rejectedNext);

    expect(rejectedRes.statusCode).toBe(403);
    expect(rejectedNext).not.toHaveBeenCalled();
  });

  it("temporarily blocks abusive clients after repeated violations", () => {
    const store = createInMemoryStore();
    const limiter = createRateLimiter({
      store,
      windowMs: 60_000,
      maxRequests: 1,
      abuseThreshold: 2,
      blockDurationMs: 60_000,
      keyGenerator: (req) => req.ip
    });

    const req = { ip: "198.51.100.7" };
    const firstRes = createMockResponse();
    const firstNext = jest.fn();
    limiter(req, firstRes, firstNext);

    const secondRes = createMockResponse();
    const secondNext = jest.fn();
    limiter(req, secondRes, secondNext);

    const blockedRes = createMockResponse();
    const blockedNext = jest.fn();
    limiter(req, blockedRes, blockedNext);

    expect(firstNext).toHaveBeenCalledTimes(1);
    expect(secondRes.statusCode).toBe(429);
    expect(blockedRes.statusCode).toBe(403);
    expect(blockedRes.body.message).toContain("temporarily blocked");
  });
});

function createMockResponse() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    setHeader(name, value) {
      this.headers[name] = value;
    }
  };
}

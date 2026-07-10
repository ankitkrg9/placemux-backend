const request = require("supertest");
const { app, validateProductionConfig } = require("../server");

describe("Production route hardening", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.NODE_ENV = "test";
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("does not expose queue stats without authentication", async () => {
    const response = await request(app).get("/api/applications/queue/stats");

    expect(response.status).toBe(401);
  });

  it("returns a generic error message in production mode", async () => {
    process.env.NODE_ENV = "production";

    const response = await request(app).get("/debug/boom");

    expect(response.status).toBe(404);
    expect(response.body.message).toBe("Request failed");
  });

  it("rejects missing production configuration", () => {
    process.env.NODE_ENV = "production";
    delete process.env.JWT_SECRET;
    delete process.env.DB_HOST;
    delete process.env.DB_PORT;
    delete process.env.DB_USER;
    delete process.env.DB_PASSWORD;
    delete process.env.DB_NAME;

    expect(() => validateProductionConfig()).toThrow(/JWT_SECRET/);
  });
});

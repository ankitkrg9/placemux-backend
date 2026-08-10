const request = require("supertest");
const { app } = require("../server");

describe("Health Endpoint", () => {
    test("GET /health should return 200 or 500", async () => {
        const res = await request(app).get("/health");

        expect([200, 500]).toContain(res.statusCode);
        expect(res.body).toHaveProperty("success");
    });
});
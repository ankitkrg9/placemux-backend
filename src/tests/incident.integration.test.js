const request = require("supertest");
const bcrypt = require("bcryptjs");
const { app } = require("../server");
const pool = require("../config/db");
const { initializeSchema } = require("../config/schema");

const company = {
    company_name: "Incident Rehearsal Co",
    email: "incident-rehearsal@test.com",
    password: "Password@123"
};

let authToken;

describe("Incident reporting and tracking", () => {
    beforeAll(async () => {
        await initializeSchema();

        const hash = await bcrypt.hash(company.password, 10);
        await pool.query(
            `INSERT INTO companies (company_name, email, password_hash)
             VALUES ($1,$2,$3)
             ON CONFLICT (email) DO NOTHING`,
            [company.company_name, company.email, hash]
        );

        const loginRes = await request(app)
            .post("/api/auth/login")
            .send({ email: company.email, password: company.password });

        authToken = loginRes.body.token;
    });

    afterAll(async () => {
        await pool.query("DELETE FROM incidents WHERE owner = $1", [company.email]);
        await pool.query("DELETE FROM companies WHERE email = $1", [company.email]);
    });

    it("reports a new incident", async () => {
        const res = await request(app)
            .post("/api/incidents/report")
            .set("Authorization", `Bearer ${authToken}`)
            .send({
                title: "Payment gateway handshake failure",
                severity: "high",
                status: "open",
                owner: company.email,
                summary: "Webhook signature verification failing intermittently"
            });

        expect(res.statusCode).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.incident).toBeDefined();
    });

    it("lists incidents", async () => {
        const res = await request(app)
            .get("/api/incidents")
            .set("Authorization", `Bearer ${authToken}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.incidents)).toBe(true);
    });
});

const request = require("supertest");
const bcrypt = require("bcryptjs");
const { app } = require("../server");
const pool = require("../config/db");
const { initializeSchema } = require("../config/schema");

const company = {
    company_name: "Jobs Rehearsal Co",
    email: "jobs-rehearsal@test.com",
    password: "Password@123"
};

let authToken;
let jobId;

describe("Job creation", () => {
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
        if (jobId) {
            await pool.query("DELETE FROM jobs WHERE id = $1", [jobId]);
        }
        await pool.query("DELETE FROM companies WHERE email = $1", [company.email]);
    });

    it("creates a job posting for an authenticated company", async () => {
        const res = await request(app)
            .post("/api/jobs")
            .set("Authorization", `Bearer ${authToken}`)
            .send({
                title: "Backend Engineer",
                description: "Build and maintain job orchestration APIs.",
                requiredCompetencyIds: [1, 2, 3],
                location: "Remote",
                salary: 120000,
                skillThresholds: { javascript: 7, node: 8 }
            });

        expect(res.statusCode).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.job).toBeDefined();
        expect(res.body.job.assessment_link).toContain("https://placemux.com/assessment/");

        jobId = res.body.job.id;
    });
});

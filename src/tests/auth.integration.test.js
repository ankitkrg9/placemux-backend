const request = require("supertest");
const bcrypt = require("bcryptjs");

const { app } = require("../server");
const pool = require("../config/db");
const { initializeSchema } = require("../config/schema");

describe("Authentication Integration Tests", () => {
    const testCompany = {
        company_name: "Integration Test Company",
        email: "integration@test.com",
        password: "Password@123"
    };

    beforeAll(async () => {
        await initializeSchema();

        const hash = await bcrypt.hash(testCompany.password, 10);

        await pool.query(
            `INSERT INTO companies (company_name, email, password_hash)
       VALUES ($1, $2, $3)
       ON CONFLICT (email) DO NOTHING`,
            [testCompany.company_name, testCompany.email, hash]
        );
    });

    afterAll(async () => {
        await pool.query(
            "DELETE FROM companies WHERE email = $1",
            [testCompany.email]
        );
    });

    test("POST /api/auth/login should login successfully", async () => {
        const res = await request(app)
            .post("/api/auth/login")
            .send({
                email: testCompany.email,
                password: testCompany.password
            });

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.token).toBeDefined();
    });
});
const request = require("supertest");
const bcrypt = require("bcryptjs");
const { app } = require("../server");
const pool = require("../config/db");
const { initializeSchema } = require("../config/schema");

const company = {
    company_name: "Concurrency Co",
    email: "concurrency@test.com",
    password: "Password@123"
};

let authToken;

describe("Concurrency safety for payments", () => {
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
        await pool.query("DELETE FROM payments WHERE reference_id = $1", ["concurrent-ref"]);
        await pool.query("DELETE FROM companies WHERE email = $1", [company.email]);
    });

    it("does not create duplicate payments under concurrent idempotent requests", async () => {
        const concurrency = 8;
        const idempKey = `concurrent-${Date.now()}`;

        const promises = [];
        for (let i = 0; i < concurrency; i++) {
            promises.push(
                request(app)
                    .post("/api/payments/initiate")
                    .set("Authorization", `Bearer ${authToken}`)
                    .set("Idempotency-Key", idempKey)
                    .send({ referenceId: "concurrent-ref", amount: 1000, currency: "INR" })
            );
        }

        const results = await Promise.all(promises);

        // Ensure at least one success and none created duplicate DB entries
        const resStatuses = results.map((r) => r.statusCode);
        expect(resStatuses).toContain(201);

        const db = await pool.query("SELECT COUNT(*)::int AS c FROM payments WHERE reference_id = $1", ["concurrent-ref"]);
        expect(db.rows[0].c).toBe(1);
    }, 20000);
});

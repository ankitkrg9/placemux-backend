const request = require("supertest");
const bcrypt = require("bcryptjs");
const { app } = require("../server");
const pool = require("../config/db");
const { initializeSchema } = require("../config/schema");

const company = {
    company_name: "Payment Rehearsal Co",
    email: "payment-rehearsal@test.com",
    password: "Password@123"
};

let authToken;
let paymentId;
let idempotencyKey;
let policyId;
let policyName;

describe("Payment rehearsal and retention", () => {
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
        idempotencyKey = `payment-init-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        policyName = `Delete old payments ${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    });

    afterAll(async () => {
        await pool.query("DELETE FROM payment_webhooks WHERE payment_id = $1", [paymentId || 0]);
        await pool.query("DELETE FROM payments WHERE id = $1", [paymentId || 0]);
        await pool.query("DELETE FROM idempotency_keys WHERE key = $1", [idempotencyKey || ""]);
        if (policyId) {
            await pool.query("DELETE FROM retention_audits WHERE policy_id = $1", [policyId]);
            await pool.query("DELETE FROM retention_policies WHERE id = $1", [policyId]);
        }
        await pool.query("DELETE FROM companies WHERE email = $1", [company.email]);
    });

    it("initiates a payment and honors idempotency", async () => {
        const res = await request(app)
            .post("/api/payments/initiate")
            .set("Authorization", `Bearer ${authToken}`)
            .set("Idempotency-Key", idempotencyKey)
            .send({
                referenceId: "ref-123",
                amount: 1500,
                currency: "INR"
            });

        expect(res.statusCode).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.payment).toBeDefined();
        paymentId = res.body.payment.id;
    });

    it("returns the same response for repeated idempotent requests", async () => {
        const res = await request(app)
            .post("/api/payments/initiate")
            .set("Authorization", `Bearer ${authToken}`)
            .set("Idempotency-Key", idempotencyKey)
            .send({
                referenceId: "ref-123",
                amount: 1500,
                currency: "INR"
            });

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.previousResponse).toBeDefined();
    });

    it("creates a retention policy and runs it successfully", async () => {
        const policyRes = await request(app)
            .post("/api/retention/policies")
            .set("Authorization", `Bearer ${authToken}`)
            .send({
                name: policyName,
                tableName: "payments",
                ttlDays: 0,
                active: true
            });

        expect(policyRes.statusCode).toBe(201);
        expect(policyRes.body.policy).toBeDefined();
        policyId = policyRes.body.policy.id;

        const runRes = await request(app)
            .post(`/api/retention/policies/${policyId}/run`)
            .set("Authorization", `Bearer ${authToken}`);

        expect(runRes.statusCode).toBe(200);
        expect(runRes.body.recordsDeleted).toBeGreaterThanOrEqual(0);
    });
});

const request = require("supertest");
const bcrypt = require("bcryptjs");

const { app } = require("../server");
const pool = require("../config/db");
const { initializeSchema } = require("../config/schema");
const { shutdownAnalyticsService } = require("../services/analyticsService");

const testCompany = {
    company_name: "Portal Consent Rights Co",
    email: "portal-consent-rights@test.com",
    password: "Password@123"
};

const testCandidate = {
    name: "Rights Candidate",
    email: "rights-candidate@test.com",
    skills: [{ competencyId: 1, level: 4 }]
};

let authToken;
let companyId;
let candidateId;
let portalSessionId;

beforeAll(async () => {
    await initializeSchema();

    const hash = await bcrypt.hash(testCompany.password, 10);

    const companyResult = await pool.query(
        `INSERT INTO companies (company_name, email, password_hash)
     VALUES ($1, $2, $3)
     ON CONFLICT (email) DO NOTHING
     RETURNING id`,
        [testCompany.company_name, testCompany.email, hash]
    );

    companyId = companyResult.rows[0]?.id;
    if (!companyId) {
        const existing = await pool.query(`SELECT id FROM companies WHERE email = $1`, [testCompany.email]);
        companyId = existing.rows[0].id;
    }

    await pool.query(
        `INSERT INTO candidates (name, email, skills)
     VALUES ($1,$2,$3)
     ON CONFLICT (email) DO NOTHING`,
        [testCandidate.name, testCandidate.email, JSON.stringify(testCandidate.skills)]
    );

    const candidateResult = await pool.query(`SELECT id FROM candidates WHERE email = $1`, [testCandidate.email]);
    candidateId = candidateResult.rows[0].id;

    const loginRes = await request(app)
        .post("/api/auth/login")
        .send({ email: testCompany.email, password: testCompany.password });

    authToken = loginRes.body.token;
});

afterAll(async () => {
    await pool.query("DELETE FROM portal_sessions WHERE company_id = $1", [companyId]);
    await pool.query("DELETE FROM consents WHERE subject_id = $1", [companyId]);
    await pool.query("DELETE FROM applications WHERE candidate_id = $1", [candidateId]);
    await pool.query("DELETE FROM candidates WHERE id = $1", [candidateId]);
    await pool.query("DELETE FROM companies WHERE id = $1", [companyId]);
    await pool.query("DELETE FROM idempotency_keys WHERE endpoint IN ($1, $2, $3)", ["/api/portals/start", "/api/portals/complete", "/api/consents"]);
    await shutdownAnalyticsService();
    await pool.end();
});

describe("Portals, Consents, and Rights integration", () => {
    it("should create a portal session and return idempotent response", async () => {
        const portalRes = await request(app)
            .post("/api/portals/start")
            .set("Authorization", `Bearer ${authToken}`)
            .set("Idempotency-Key", `portal-start-${Date.now()}`)
            .send({ portalType: "college", candidateId, metadata: { source: "integration" } });

        expect(portalRes.statusCode).toBe(201);
        expect(portalRes.body.success).toBe(true);
        expect(portalRes.body.portalSession).toBeDefined();
        portalSessionId = portalRes.body.portalSession.id;
    });

    it("should complete the portal session and persist the status", async () => {
        const completeRes = await request(app)
            .post("/api/portals/complete")
            .set("Authorization", `Bearer ${authToken}`)
            .set("Idempotency-Key", `portal-complete-${Date.now()}`)
            .send({ portalId: portalSessionId, status: "COMPLETED", metadata: { finalStatus: "success" } });

        expect(completeRes.statusCode).toBe(200);
        expect(completeRes.body.success).toBe(true);
        expect(completeRes.body.portalSession.status).toBe("COMPLETED");
    });

    it("should record company consent and allow fetching it", async () => {
        const consentRes = await request(app)
            .post("/api/consents")
            .set("Authorization", `Bearer ${authToken}`)
            .set("Idempotency-Key", `company-consent-${Date.now()}`)
            .send({
                subjectType: "company",
                subjectId: companyId,
                consentType: "data_processing",
                granted: true,
                details: { purpose: "placement" }
            });

        expect(consentRes.statusCode).toBe(201);
        expect(consentRes.body.success).toBe(true);
        expect(consentRes.body.consent).toBeDefined();

        const fetchRes = await request(app)
            .get(`/api/consents/company/${companyId}`)
            .set("Authorization", `Bearer ${authToken}`);

        expect(fetchRes.statusCode).toBe(200);
        expect(fetchRes.body.consents.length).toBeGreaterThan(0);
    });

    it("should return data rights snapshot for the company", async () => {
        const rightsRes = await request(app)
            .get(`/api/rights/company/${companyId}`)
            .set("Authorization", `Bearer ${authToken}`);

        expect(rightsRes.statusCode).toBe(200);
        expect(rightsRes.body.success).toBe(true);
        expect(rightsRes.body.rights.dataSnapshot).toBeDefined();
    });

    it("should delete candidate data with rights erasure", async () => {
        const eraseRes = await request(app)
            .delete(`/api/rights/candidate/${candidateId}`)
            .set("Authorization", `Bearer ${authToken}`);

        expect(eraseRes.statusCode).toBe(200);
        expect(eraseRes.body.success).toBe(true);
    });
});

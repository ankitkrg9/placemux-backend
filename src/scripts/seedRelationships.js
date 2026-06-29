const pool = require("../config/db");
const { initializeSchema } = require("../config/schema");

const seedRelationships = async () => {
  await initializeSchema();

  const companyResult = await pool.query(
    `
    INSERT INTO companies (company_name, email, password_hash)
    VALUES ($1, $2, $3)
    ON CONFLICT (email) DO NOTHING
    RETURNING id
    `,
    ["Altrodav", "team@altrodav.com", "$2a$10$placeholder"]
  );

  const companyId = companyResult.rows[0]?.id;

  if (!companyId) {
    const existingCompany = await pool.query(
      "SELECT id FROM companies WHERE email = $1",
      ["team@altrodav.com"]
    );
    if (existingCompany.rows.length === 0) {
      throw new Error("Could not create or locate seed company");
    }
    companyId = existingCompany.rows[0].id;
  }

  await pool.query(
    `
    INSERT INTO jobs (company_id, title, description, location, salary, required_competency_ids, skill_thresholds)
    VALUES
      ($1, 'Backend Engineer', 'Build reliable backend services', 'Remote', 120000, '[{"id": 1}]', '[{"competencyId": 1, "minimumLevel": 3}]'),
      ($1, 'Frontend Engineer', 'Ship polished interfaces', 'Hybrid', 100000, '[{"id": 2}]', '[{"competencyId": 2, "minimumLevel": 2}]')
    ON CONFLICT (company_id, title) DO NOTHING
    `,
    [companyId]
  );

  const candidateResult = await pool.query(
    `
    INSERT INTO candidates (name, email, skills)
    VALUES ($1, $2, $3)
    ON CONFLICT (email) DO NOTHING
    RETURNING id
    `,
    ["Asha Patel", "asha@example.com", JSON.stringify([{ competencyId: 1, level: 4 }, { competencyId: 2, level: 2 }])]
  );

  const candidateId = candidateResult.rows[0]?.id;

  if (!candidateId) {
    const existingCandidate = await pool.query(
      "SELECT id FROM candidates WHERE email = $1",
      ["asha@example.com"]
    );
    if (existingCandidate.rows.length === 0) {
      throw new Error("Could not create or locate seed candidate");
    }
    candidateId = existingCandidate.rows[0].id;
  }

  const jobs = await pool.query(
    "SELECT id FROM jobs WHERE company_id = $1 ORDER BY id",
    [companyId]
  );

  for (const job of jobs.rows) {
    await pool.query(
      `
      INSERT INTO applications (job_id, candidate_id, status)
      VALUES ($1, $2, $3)
      ON CONFLICT (job_id, candidate_id) DO NOTHING
      `,
      [job.id, candidateId, job.id % 2 === 0 ? "REJECTED_THRESHOLD" : "APPLIED"]
    );
  }

  console.log("Seed data completed");
};

seedRelationships().catch((error) => {
  console.error(error);
  process.exit(1);
});

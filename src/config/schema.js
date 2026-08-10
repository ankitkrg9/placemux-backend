const pool = require("./db");

const initializeSchema = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS companies (
      id SERIAL PRIMARY KEY,
      company_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='companies' AND column_name='activated'
      ) THEN
        ALTER TABLE companies ADD COLUMN activated BOOLEAN NOT NULL DEFAULT false;
      END IF;
    END$$;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS company_profiles (
      id SERIAL PRIMARY KEY,
      company_id INTEGER NOT NULL UNIQUE REFERENCES companies(id) ON DELETE CASCADE,
      industry TEXT,
      website TEXT,
      description TEXT,
      location TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS company_kyc (
      id SERIAL PRIMARY KEY,
      company_id INTEGER NOT NULL UNIQUE REFERENCES companies(id) ON DELETE CASCADE,
      pan_number TEXT,
      gst_number TEXT,
      document_url TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS idempotency_keys (
      id SERIAL PRIMARY KEY,
      key TEXT NOT NULL UNIQUE,
      endpoint TEXT NOT NULL,
      response JSONB NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS candidates (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      skills JSONB DEFAULT '[]'::jsonb,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    WITH duplicate_candidates AS (
      SELECT id,
             email,
             ROW_NUMBER() OVER (PARTITION BY email ORDER BY id) AS rn
      FROM candidates
    ),
    keepers AS (
      SELECT email, MIN(id) AS keep_id
      FROM duplicate_candidates
      WHERE rn = 1
      GROUP BY email
    ),
    duplicates AS (
      SELECT d.id AS dup_id, k.keep_id
      FROM duplicate_candidates d
      JOIN keepers k ON d.email = k.email
      WHERE d.rn > 1
    )
    UPDATE applications
    SET candidate_id = duplicates.keep_id
    FROM duplicates
    WHERE applications.candidate_id = duplicates.dup_id;

    WITH duplicate_candidates AS (
      SELECT id,
             email,
             ROW_NUMBER() OVER (PARTITION BY email ORDER BY id) AS rn
      FROM candidates
    ),
    keepers AS (
      SELECT email, MIN(id) AS keep_id
      FROM duplicate_candidates
      WHERE rn = 1
      GROUP BY email
    ),
    duplicates AS (
      SELECT d.id AS dup_id, k.keep_id
      FROM duplicate_candidates d
      JOIN keepers k ON d.email = k.email
      WHERE d.rn > 1
    )
    UPDATE portal_sessions
    SET candidate_id = duplicates.keep_id
    FROM duplicates
    WHERE portal_sessions.candidate_id = duplicates.dup_id;

    WITH duplicate_candidates AS (
      SELECT id,
             email,
             ROW_NUMBER() OVER (PARTITION BY email ORDER BY id) AS rn
      FROM candidates
    ),
    keepers AS (
      SELECT email, MIN(id) AS keep_id
      FROM duplicate_candidates
      WHERE rn = 1
      GROUP BY email
    ),
    duplicates AS (
      SELECT d.id AS dup_id, k.keep_id
      FROM duplicate_candidates d
      JOIN keepers k ON d.email = k.email
      WHERE d.rn > 1
    )
    DELETE FROM candidates
    WHERE id IN (SELECT dup_id FROM duplicates);
  `);

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS candidates_email_unique
    ON candidates(email)
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS jobs (
      id SERIAL PRIMARY KEY,
      company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      required_competency_ids JSONB DEFAULT '[]'::jsonb,
      location TEXT,
      salary NUMERIC(10,2),
      skill_thresholds JSONB DEFAULT '[]'::jsonb,
      assessment_link TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (company_id, title)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS applications (
      id SERIAL PRIMARY KEY,
      job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
      candidate_id INTEGER NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'APPLIED',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (job_id, candidate_id)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS portal_sessions (
      id SERIAL PRIMARY KEY,
      company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      candidate_id INTEGER REFERENCES candidates(id) ON DELETE SET NULL,
      portal_type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING',
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      completed_at TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS consents (
      id SERIAL PRIMARY KEY,
      subject_type TEXT NOT NULL,
      subject_id INTEGER NOT NULL,
      consent_type TEXT NOT NULL,
      granted BOOLEAN NOT NULL,
      granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      expires_at TIMESTAMP,
      details JSONB DEFAULT '{}',
      UNIQUE (subject_type, subject_id, consent_type)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS payments (
      id SERIAL PRIMARY KEY,
      reference_id TEXT NOT NULL UNIQUE,
      amount NUMERIC(10,2) NOT NULL,
      currency TEXT NOT NULL DEFAULT 'INR',
      candidate_id INTEGER REFERENCES candidates(id) ON DELETE SET NULL,
      description TEXT,
      metadata JSONB DEFAULT '{}'::jsonb,
      gateway_reference TEXT,
      gateway_status TEXT NOT NULL DEFAULT 'CREATED',
      status TEXT NOT NULL DEFAULT 'PENDING',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS payment_webhooks (
      id SERIAL PRIMARY KEY,
      payment_id INTEGER NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
      payload JSONB NOT NULL,
      status TEXT NOT NULL,
      received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS incidents (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      severity TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      owner TEXT,
      summary TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS retention_policies (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      table_name TEXT NOT NULL,
      ttl_days INTEGER NOT NULL,
      active BOOLEAN NOT NULL DEFAULT true,
      last_run_at TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS retention_audits (
      id SERIAL PRIMARY KEY,
      policy_id INTEGER NOT NULL REFERENCES retention_policies(id) ON DELETE CASCADE,
      records_deleted INTEGER NOT NULL,
      details JSONB DEFAULT '{}'::jsonb,
      deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS outbox (
      id SERIAL PRIMARY KEY,
      aggregate_type TEXT NOT NULL,
      aggregate_id INTEGER NOT NULL,
      event_type TEXT NOT NULL,
      payload JSONB NOT NULL,
      published BOOLEAN NOT NULL DEFAULT false,
      attempts INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS outbox_deadletter (
      id SERIAL PRIMARY KEY,
      original_outbox_id INTEGER,
      aggregate_type TEXT NOT NULL,
      aggregate_id INTEGER NOT NULL,
      event_type TEXT NOT NULL,
      payload JSONB NOT NULL,
      reason TEXT,
      failed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
};

module.exports = {
  initializeSchema
};

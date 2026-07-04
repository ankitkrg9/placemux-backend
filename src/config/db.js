const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  max: Number(process.env.DB_POOL_MAX || 12),
  idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT_MS || 30000),
  connectionTimeoutMillis: Number(process.env.DB_CONNECTION_TIMEOUT_MS || 1500),
  statement_timeout: Number(process.env.DB_STATEMENT_TIMEOUT_MS || 5000),
});

pool.on("error", (error) => {
  console.error("Unexpected Postgres pool error", error);
});

const query = (text, params) => pool.query(text, params);

const withTransaction = async (callback) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      console.error("Transaction rollback failed", rollbackError);
    }
    throw error;
  } finally {
    client.release();
  }
};

const mapDbError = (error) => {
  if (!error || typeof error !== "object") {
    return {
      status: 500,
      message: "Unknown database error",
    };
  }

  if (error.code === "23505") {
    return {
      status: 409,
      message: "A record with the same unique value already exists.",
    };
  }

  if (error.code === "23503") {
    return {
      status: 409,
      message: "A related resource is missing or invalid.",
    };
  }

  if (error.status && typeof error.status === "number") {
    return {
      status: error.status,
      message: error.message || "Database error",
    };
  }

  return {
    status: 500,
    message: error.message || "Database error",
  };
};

pool.withTransaction = withTransaction;
pool.mapDbError = mapDbError;

module.exports = pool;
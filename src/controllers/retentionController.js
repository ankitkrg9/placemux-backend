const pool = require("../config/db");

const createRetentionPolicy = async (req, res) => {
    try {
        const { name, tableName, ttlDays, active = true } = req.body;

        if (!name || !tableName || !Number.isInteger(ttlDays) || ttlDays < 0) {
            return res.status(400).json({
                success: false,
                message: "Valid name, tableName, and ttlDays are required"
            });
        }

        const allowedTables = [
            "applications",
            "portal_sessions",
            "payment_webhooks",
            "payments"
        ];

        if (!allowedTables.includes(tableName)) {
            return res.status(400).json({
                success: false,
                message: `Retention policy cannot be created for table ${tableName}`
            });
        }

        const result = await pool.query(
            `
      INSERT INTO retention_policies
      (name, table_name, ttl_days, active)
      VALUES ($1,$2,$3,$4)
      RETURNING *
      `,
            [name, tableName, ttlDays, active]
        );

        res.status(201).json({
            success: true,
            policy: result.rows[0]
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Unable to create retention policy"
        });
    }
};

const listRetentionPolicies = async (req, res) => {
    try {
        const result = await pool.query(
            `
      SELECT *
      FROM retention_policies
      ORDER BY created_at DESC
      `
        );

        res.status(200).json({
            success: true,
            policies: result.rows
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Unable to list retention policies"
        });
    }
};

const runRetention = async (req, res) => {
    try {
        const policyResult = await pool.query(
            `
      SELECT *
      FROM retention_policies
      WHERE id = $1
      AND active = true
      `,
            [Number(req.params.policyId)]
        );

        if (policyResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Retention policy not found or inactive"
            });
        }

        const policy = policyResult.rows[0];
        const cutoff = new Date(Date.now() - policy.ttl_days * 24 * 60 * 60 * 1000).toISOString();

        let deleteSql;
        switch (policy.table_name) {
            case "applications":
            case "payment_webhooks":
            case "payments":
                deleteSql = `DELETE FROM ${policy.table_name} WHERE created_at < $1`;
                break;
            case "portal_sessions":
                deleteSql = `DELETE FROM portal_sessions WHERE completed_at IS NOT NULL AND completed_at < $1`;
                break;
            default:
                return res.status(400).json({
                    success: false,
                    message: "Unsupported retention table"
                });
        }

        const deleteResult = await pool.withTransaction(async (client) => {
            const result = await client.query(deleteSql, [cutoff]);
            await client.query(
                `
        UPDATE retention_policies
        SET last_run_at = CURRENT_TIMESTAMP
        WHERE id = $1
        `,
                [policy.id]
            );
            await client.query(
                `
        INSERT INTO retention_audits
        (policy_id, records_deleted, details)
        VALUES ($1,$2,$3)
        `,
                [policy.id, result.rowCount, JSON.stringify({ cutoff })]
            );
            return result.rowCount;
        });

        res.status(200).json({
            success: true,
            recordsDeleted: deleteResult,
            message: `Retention policy ${policy.name} executed`
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Unable to execute retention policy"
        });
    }
};

module.exports = {
    createRetentionPolicy,
    listRetentionPolicies,
    runRetention
};

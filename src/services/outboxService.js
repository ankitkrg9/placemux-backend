const pool = require("../config/db");

const writeEvent = async (client, { aggregateType, aggregateId, eventType, payload }) => {
    // If a client is provided, use it (transactional), otherwise use pool
    const q = `
    INSERT INTO outbox
    (aggregate_type, aggregate_id, event_type, payload)
    VALUES ($1,$2,$3,$4)
    RETURNING *
  `;

    const params = [aggregateType, aggregateId, eventType, JSON.stringify(payload || {})];

    if (client && typeof client.query === "function") {
        const res = await client.query(q, params);
        return res.rows[0];
    }

    const res = await pool.query(q, params);
    return res.rows[0];
};

const fetchUnpublished = async (limit = 50) => {
    const res = await pool.query(
        `SELECT * FROM outbox WHERE published = false ORDER BY id ASC LIMIT $1`,
        [limit]
    );
    return res.rows;
};

const markPublished = async (ids) => {
    if (!ids || !ids.length) return 0;
    const res = await pool.query(
        `UPDATE outbox SET published = true WHERE id = ANY($1::int[]) RETURNING id`,
        [ids]
    );
    return res.rowCount;
};

const incrementAttempt = async (id) => {
    await pool.query(`UPDATE outbox SET attempts = attempts + 1 WHERE id = $1`, [id]);
};

const moveToDeadLetter = async (event, reason) => {
    await pool.query(
        `INSERT INTO outbox_deadletter (original_outbox_id, aggregate_type, aggregate_id, event_type, payload, reason) VALUES ($1,$2,$3,$4,$5,$6)`,
        [event.id, event.aggregate_type, event.aggregate_id, event.event_type, event.payload, reason || null]
    );

    await pool.query(`DELETE FROM outbox WHERE id = $1`, [event.id]);
};

module.exports = {
    writeEvent,
    fetchUnpublished,
    markPublished
};

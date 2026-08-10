const pool = require("../config/db");
const { paymentInitiateSchema } = require("../validators/paymentValidator");
const { createPaymentIntent, verifyWebhookSignature } = require("../services/paymentGateway");

const metrics = require("../services/metricsService");

let currentPaymentConcurrency = 0;
const MAX_PAYMENT_CONCURRENCY = Number(process.env.MAX_PAYMENT_CONCURRENCY || 5);

const initiatePayment = async (req, res) => {
    try {
        const validation = paymentInitiateSchema.safeParse(req.body);

        if (!validation.success) {
            return res.status(400).json({
                success: false,
                errors: validation.error.issues
            });
        }

        const idempotencyKey = req.headers["idempotency-key"];

        if (!idempotencyKey) {
            return res.status(400).json({
                success: false,
                message: "Idempotency-Key header required"
            });
        }

        const existingKey = await pool.query(
            `SELECT response FROM idempotency_keys WHERE key = $1`,
            [idempotencyKey]
        );

        if (existingKey.rows.length > 0) {
            return res.status(200).json({
                success: true,
                message: "Already processed",
                previousResponse: existingKey.rows[0].response
            });
        }

        const {
            referenceId,
            amount,
            currency,
            candidateId,
            description,
            metadata
        } = validation.data;

        if (currentPaymentConcurrency >= MAX_PAYMENT_CONCURRENCY) {
            metrics.increment("payments.rejected_concurrency");
            res.setHeader("Retry-After", "2");
            return res.status(429).json({ success: false, message: "Too many concurrent payment requests, retry shortly" });
        }

        currentPaymentConcurrency += 1;
        try {
            const responseData = await pool.withTransaction(async (client) => {
                const paymentResult = await client.query(
                    `
        INSERT INTO payments
        (reference_id, amount, currency, candidate_id, description, metadata)
        VALUES ($1,$2,$3,$4,$5,$6)
        RETURNING *
        `,
                    [referenceId, amount, currency, candidateId || null, description || null, JSON.stringify(metadata || {})]
                );

                const payment = paymentResult.rows[0];
                const gateway = await createPaymentIntent({
                    paymentId: payment.id,
                    amount,
                    currency,
                    referenceId
                });
                await client.query(
                    `
        UPDATE payments
        SET gateway_reference = $1,
            gateway_status = $2,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
        `,
                    [gateway.gatewayId, gateway.status, payment.id]
                );

                // Transactional outbox event for analytics/streaming
                await client.query(
                    `
        INSERT INTO outbox
        (aggregate_type, aggregate_id, event_type, payload)
        VALUES ($1,$2,$3,$4)
        `,
                    ["payment", payment.id, "payment.initiated.v1", JSON.stringify({ paymentId: payment.id, referenceId, amount, currency })]
                );

                const responsePayload = {
                    success: true,
                    message: "Payment initiated",
                    payment: {
                        ...payment,
                        gateway
                    }
                };

                await client.query(
                    `
        INSERT INTO idempotency_keys
        (key, endpoint, response)
        VALUES ($1,$2,$3)
        `,
                    [idempotencyKey, "/api/payments/initiate", JSON.stringify(responsePayload)]
                );

                return responsePayload;
            });

            res.status(201).json(responseData);
        } finally {
            currentPaymentConcurrency = Math.max(0, currentPaymentConcurrency - 1);
        }
    } catch (error) {
        console.error(error);
        const dbError = pool.mapDbError(error);

        res.status(dbError.status).json({
            success: false,
            message: dbError.message
        });
    }
};

const handleWebhook = async (req, res) => {
    try {
        const signature = req.headers["x-payment-signature"];
        const secret = process.env.PAYMENT_WEBHOOK_SECRET;

        if (!verifyWebhookSignature(req.body, signature, secret)) {
            return res.status(401).json({
                success: false,
                message: "Invalid webhook signature"
            });
        }

        const { paymentId, status, gatewayReference, amount, currency, referenceId } = req.body;

        const result = await pool.query(
            `
      SELECT *
      FROM payments
      WHERE id = $1
      `,
            [paymentId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Payment record not found"
            });
        }

        const payment = result.rows[0];

        await pool.withTransaction(async (client) => {
            await client.query(
                `
        UPDATE payments
        SET gateway_status = $1,
            gateway_reference = $2,
            status = $3,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $4
        `,
                [status, gatewayReference, status === "PAID" ? "COMPLETED" : "FAILED", paymentId]
            );

            await client.query(
                `
        INSERT INTO payment_webhooks
        (payment_id, payload, status)
        VALUES ($1,$2,$3)
        `,
                [paymentId, JSON.stringify(req.body), status]
            );
        });

        res.status(200).json({
            success: true,
            message: "Webhook processed"
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Unable to process webhook"
        });
    }
};

const getPaymentReconciliation = async (req, res) => {
    try {
        const result = await pool.query(
            `
      SELECT
        p.id,
        p.reference_id,
        p.amount,
        p.currency,
        p.status AS payment_status,
        p.gateway_status,
        p.gateway_reference,
        p.created_at,
        p.updated_at
      FROM payments p
      ORDER BY p.created_at DESC
      `
        );

        res.status(200).json({
            success: true,
            reconciliation: result.rows
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Unable to retrieve payment reconciliation"
        });
    }
};

module.exports = {
    initiatePayment,
    handleWebhook,
    getPaymentReconciliation
};

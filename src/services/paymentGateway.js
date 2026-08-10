const crypto = require("crypto");

const CircuitBreaker = require("./circuitBreaker");

const breaker = new CircuitBreaker({ failureThreshold: 4, timeout: 8000, resetTimeout: 20000 });

const createPaymentIntent = async ({ paymentId, amount, currency, referenceId }) => {
    return breaker.exec(async () => {
        // simulate work and return a deterministic mock
        return {
            gatewayId: `gw-${paymentId}-${Date.now()}`,
            status: "CREATED",
            checkoutUrl: `https://mock-pay.example.com/checkout/${encodeURIComponent(referenceId)}`,
            issuedAt: new Date().toISOString(),
            payload: {
                amount,
                currency,
                referenceId
            }
        };
    });
};

const verifyWebhookSignature = (payload, signature, secret) => {
    if (!secret || !signature) {
        return false;
    }

    const payloadText = JSON.stringify(payload);
    const expected = crypto.createHmac("sha256", secret).update(payloadText).digest("hex");

    try {
        return crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(signature, "hex"));
    } catch (error) {
        return false;
    }
};

module.exports = {
    createPaymentIntent,
    verifyWebhookSignature
};

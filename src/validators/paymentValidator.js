const { z } = require("zod");

const paymentInitiateSchema = z.object({
    referenceId: z.string().min(1),
    amount: z.number().positive(),
    currency: z.string().min(1).default("INR"),
    candidateId: z.number().int().positive().optional(),
    description: z.string().max(255).optional(),
    metadata: z.record(z.any()).optional()
});

module.exports = {
    paymentInitiateSchema
};

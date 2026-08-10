const { z } = require("zod");

const portalStartSchema = z.object({
    portalType: z.enum(["college", "admin"]),
    candidateId: z.number().int().positive().optional(),
    metadata: z.record(z.any()).optional()
});

const portalCompleteSchema = z.object({
    portalId: z.number().int(),
    status: z.enum(["COMPLETED", "FAILED"]),
    metadata: z.record(z.any()).optional()
});

const portalDryRunSchema = z.object({
    portalType: z.enum(["college", "admin"]),
    candidateId: z.number().int().positive().optional(),
    action: z.string().min(1).optional()
});

module.exports = {
    portalStartSchema,
    portalCompleteSchema,
    portalDryRunSchema
};
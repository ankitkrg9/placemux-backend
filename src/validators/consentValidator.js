const { z } = require("zod");

const consentCreateSchema = z.object({
    subjectType: z.enum(["company", "candidate"]),
    subjectId: z.number().int().positive(),
    consentType: z.string().min(1),
    granted: z.boolean(),
    expiresAt: z.string().datetime().optional(),
    details: z.record(z.any()).optional()
});

module.exports = {
    consentCreateSchema
};
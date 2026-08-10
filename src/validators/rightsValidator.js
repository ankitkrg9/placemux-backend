const { z } = require("zod");

const rightsSubjectParamsSchema = z.object({
    subjectType: z.enum(["company", "candidate"]),
    subjectId: z.preprocess((value) => Number(value), z.number().int().positive())
});

module.exports = {
    rightsSubjectParamsSchema
};
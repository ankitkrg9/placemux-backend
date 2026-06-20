const { z } = require("zod");

const createJobSchema = z.object({
  companyId: z.number(),
  title: z.string().min(3),
  description: z.string().min(5),
  requiredCompetencyIds: z.array(z.number()),
  location: z.string(),
  salary: z.number(),

  skillThresholds: z.array(
    z.object({
      competencyId: z.number(),
      minimumLevel: z.number().min(1).max(100)
    })
  )
});

module.exports = {
  createJobSchema
};
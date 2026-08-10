const { z } = require("zod");

const createJobSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(5),
  requiredCompetencyIds: z.array(z.number()),
  location: z.string(),
  salary: z.number(),

  // Accept either an array of structured thresholds or a simple map of skill->level
  skillThresholds: z
    .union([
      z.array(
        z.object({
          competencyId: z.number(),
          minimumLevel: z.number().min(1).max(100)
        })
      ),
      z.record(z.number())
    ])
    .optional()
});

module.exports = {
  createJobSchema
};
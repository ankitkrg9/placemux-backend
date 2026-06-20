const { z } = require("zod");

const createCandidateSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),

  skills: z.array(
    z.object({
      competencyId: z.number(),
      level: z.number().min(1).max(100)
    })
  )
});

module.exports = {
  createCandidateSchema
};
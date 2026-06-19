const { z } = require("zod");

const createCandidateSchema = z.object({
  name: z.string().min(2),
  email: z.email("Invalid email"),
  skills: z.array(z.number())
});

module.exports = {
  createCandidateSchema
};
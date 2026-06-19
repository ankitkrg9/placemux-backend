const { z } = require("zod");

const createJobSchema = z.object({
  companyId: z.number(),
  title: z.string().min(3, "Job title required"),
  description: z.string().min(5, "Description required"),
  requiredCompetencyIds: z.array(z.number()),
  location: z.string().min(2),
  salary: z.number().positive()
});

module.exports = {
  createJobSchema
};
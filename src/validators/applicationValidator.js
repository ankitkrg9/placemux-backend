const { z } = require("zod");

const applicationSchema = z.object({
  candidateId: z.number(),
  jobId: z.number()
});

module.exports = {
  applicationSchema
};
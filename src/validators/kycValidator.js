const { z } = require("zod");

const kycSchema = z.object({
  companyId: z.number(),
  panNumber: z.string().min(10),
  gstNumber: z.string().min(15),
  documentUrl: z.string().url()
});

module.exports = {
  kycSchema
};
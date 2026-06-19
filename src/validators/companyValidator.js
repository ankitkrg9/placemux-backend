const { z } = require("zod");

const companySignupSchema = z.object({
  companyName: z.string().min(2),
  email: z.email(),
  password: z.string().min(6)
});

module.exports = {
  companySignupSchema
};
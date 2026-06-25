const { z } = require("zod");

const companySignupSchema = z.object({
  companyName: z.string().min(2, "Company name required"),
  email: z.email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters")
});

const companyLoginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters")
});

module.exports = {
  companySignupSchema,
  companyLoginSchema
};
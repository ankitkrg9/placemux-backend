const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");
const { companyLoginSchema } = require("../validators/companyValidator");

const generateAccessToken = (company) => {
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    throw new Error("JWT_SECRET environment variable is required");
  }

  return jwt.sign(
    {
      companyId: company.id,
      email: company.email,
      role: "company"
    },
    jwtSecret,
    { expiresIn: process.env.JWT_EXPIRES_IN || "1h" }
  );
};

const loginCompany = async (req, res) => {
  try {
    const validation = companyLoginSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        errors: validation.error.issues
      });
    }

    const { email, password } = req.body;

    const existingCompany = await pool.query(
      "SELECT * FROM companies WHERE email = $1",
      [email]
    );

    if (existingCompany.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    const company = existingCompany.rows[0];

    const isPasswordValid = await bcrypt.compare(
      password,
      company.password_hash
    );

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    const token = generateAccessToken(company);

    delete company.password_hash;

    res.status(200).json({
      success: true,
      token,
      company
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  loginCompany
};

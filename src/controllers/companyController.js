const pool = require("../config/db");
const bcrypt = require("bcryptjs");

const signupCompany = async (req, res) => {
  try {
    const { companyName, email, password } = req.body;

    const existingCompany = await pool.query(
      "SELECT * FROM companies WHERE email = $1",
      [email]
    );

    if (existingCompany.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Company already exists"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `
      INSERT INTO companies
      (company_name, email, password_hash)
      VALUES ($1, $2, $3)
      RETURNING *
      `,
      [companyName, email, hashedPassword]
    );

    const company = result.rows[0];

delete company.password_hash;

res.status(201).json({
  success: true,
  company
});

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server Error"
    });
  }
};

module.exports = {
  signupCompany
};
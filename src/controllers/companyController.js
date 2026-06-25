const pool = require("../config/db");
const bcrypt = require("bcryptjs");

const {
  companySignupSchema
} = require("../validators/companyValidator");

const {
  kycSchema
} = require("../validators/kycValidator");

// ====================
// COMPANY SIGNUP
// ====================

const signupCompany = async (req, res) => {
  try {

    const validation =
      companySignupSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        errors: validation.error.issues
      });
    }

    const {
      companyName,
      email,
      password
    } = req.body;

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

    const hashedPassword =
      await bcrypt.hash(password, 10);

    const result = await pool.query(
      `
      INSERT INTO companies
      (
        company_name,
        email,
        password_hash
      )
      VALUES ($1,$2,$3)
      RETURNING *
      `,
      [
        companyName,
        email,
        hashedPassword
      ]
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
      message: error.message
    });
  }
};

// ====================
// CREATE PROFILE
// ====================

const createProfile = async (req, res) => {
  try {

    const {
      companyId,
      industry,
      website,
      description,
      location
    } = req.body;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "Company ID required"
      });
    }

    const company = await pool.query(
      "SELECT * FROM companies WHERE id = $1",
      [companyId]
    );

    if (company.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Company not found"
      });
    }

    const result = await pool.query(
      `
      INSERT INTO company_profiles
      (
        company_id,
        industry,
        website,
        description,
        location
      )
      VALUES ($1,$2,$3,$4,$5)
      RETURNING *
      `,
      [
        companyId,
        industry,
        website,
        description,
        location
      ]
    );

    res.status(201).json({
      success: true,
      profile: result.rows[0]
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ====================
// KYC
// ====================

const submitKYC = async (req, res) => {
  try {

    const validation =
      kycSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        errors: validation.error.issues
      });
    }

    const {
      companyId,
      panNumber,
      gstNumber,
      documentUrl
    } = req.body;

    const idempotencyKey =
      req.headers["idempotency-key"];

    if (!idempotencyKey) {
      return res.status(400).json({
        success: false,
        message: "Idempotency-Key header required"
      });
    }

    const existingKey = await pool.query(
      `
      SELECT *
      FROM idempotency_keys
      WHERE key = $1
      `,
      [idempotencyKey]
    );

    if (existingKey.rows.length > 0) {
      return res.status(200).json({
        success: true,
        message: "Already Processed",
        previousResponse:
          existingKey.rows[0].response
      });
    }

    const company = await pool.query(
      `
      SELECT *
      FROM companies
      WHERE id = $1
      `,
      [companyId]
    );

    if (company.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Company not found"
      });
    }

    const responseData = await pool.withTransaction(async (client) => {
      const existingKyc = await client.query(
        `
        SELECT *
        FROM company_kyc
        WHERE company_id = $1
        `,
        [companyId]
      );

      if (existingKyc.rows.length > 0) {
        const error = new Error("KYC already submitted");
        error.status = 400;
        throw error;
      }

      const result = await client.query(
        `
        INSERT INTO company_kyc
        (
          company_id,
          pan_number,
          gst_number,
          document_url
        )
        VALUES ($1,$2,$3,$4)
        RETURNING *
        `,
        [
          companyId,
          panNumber,
          gstNumber,
          documentUrl
        ]
      );

      const responseData = {
        success: true,
        message: "KYC submitted successfully",
        kyc: result.rows[0]
      };

      await client.query(
        `
        INSERT INTO idempotency_keys
        (
          key,
          endpoint,
          response
        )
        VALUES ($1,$2,$3)
        `,
        [
          idempotencyKey,
          "/api/company/kyc",
          JSON.stringify(responseData)
        ]
      );

      return responseData;
    });

    res.status(201).json(responseData);

  } catch (error) {
    console.error(error);
    const dbError = pool.mapDbError(error);

    res.status(dbError.status).json({
      success: false,
      message: dbError.message
    });
  }
};

module.exports = {
  signupCompany,
  createProfile,
  submitKYC
};
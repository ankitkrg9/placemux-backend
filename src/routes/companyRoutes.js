const express = require("express");

const router = express.Router();

const { authenticateToken } = require("../middleware/authMiddleware");
const {
  signupCompany,
  createProfile,
  submitKYC
} = require("../controllers/companyController");

router.post("/signup", signupCompany);
router.post("/profile", authenticateToken, createProfile);
router.post("/kyc", authenticateToken, submitKYC);

module.exports = router;
const express = require("express");

const router = express.Router();

const {
  signupCompany,
  createProfile,
  submitKYC
} = require("../controllers/companyController");

router.post("/signup", signupCompany);
router.post("/profile", createProfile);
router.post("/kyc", submitKYC);

module.exports = router;
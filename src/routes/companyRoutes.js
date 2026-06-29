const express = require("express");

const router = express.Router();

const { authenticateToken } = require("../middleware/authMiddleware");
const {
  signupCompany,
  createProfile,
  submitKYC,
  getRelationshipOverview
} = require("../controllers/companyController");

router.post("/signup", signupCompany);
router.post("/profile", authenticateToken, createProfile);
router.post("/kyc", authenticateToken, submitKYC);
router.get("/relationships/:companyId", authenticateToken, getRelationshipOverview);

module.exports = router;
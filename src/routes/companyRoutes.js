const express = require("express");

const router = express.Router();

const {
  signupCompany
} = require("../controllers/companyController");

router.post("/signup", signupCompany);

module.exports = router;
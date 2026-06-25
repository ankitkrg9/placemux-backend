const express = require("express");

const router = express.Router();

const { authenticateToken } = require("../middleware/authMiddleware");
const {
  createJob
} = require("../controllers/jobController");

router.post("/", authenticateToken, createJob);

module.exports = router;
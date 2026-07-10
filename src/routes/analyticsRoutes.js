const express = require("express");

const router = express.Router();
const { getBaselineReportHandler } = require("../controllers/analyticsController");
const { authenticateToken } = require("../middleware/authMiddleware");

router.get("/baseline", authenticateToken, getBaselineReportHandler);

module.exports = router;

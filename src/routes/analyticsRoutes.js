const express = require("express");

const router = express.Router();
const { getBaselineReportHandler } = require("../controllers/analyticsController");

router.get("/baseline", getBaselineReportHandler);

module.exports = router;

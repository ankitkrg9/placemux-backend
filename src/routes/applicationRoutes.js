const express = require("express");

const router = express.Router();

const {
  applyJob
} = require("../controllers/applicationController");

router.post("/", applyJob);

module.exports = router;
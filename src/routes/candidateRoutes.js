const express = require("express");

const router = express.Router();

const {
  createCandidate
} = require("../controllers/candidateController");

router.post("/", createCandidate);

module.exports = router;
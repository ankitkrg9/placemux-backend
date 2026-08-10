const express = require("express");

const router = express.Router();

const {
  createCandidate
} = require("../controllers/candidateController");

/**
 * @swagger
 * tags:
 *   name: Candidates
 *   description: Candidate Management APIs
 */

/**
 * @swagger
 * /api/candidates:
 *   post:
 *     summary: Register a new candidate
 *     description: Creates a new candidate profile.
 *     tags: [Candidates]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Candidate registered successfully.
 *       400:
 *         description: Invalid request.
 *       500:
 *         description: Internal server error.
 */
router.post("/", createCandidate);

module.exports = router;
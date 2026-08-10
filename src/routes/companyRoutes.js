const express = require("express");

const router = express.Router();

const { authenticateToken } = require("../middleware/authMiddleware");
const {
  signupCompany,
  createProfile,
  submitKYC,
  getRelationshipOverview,
  activateCompany
} = require("../controllers/companyController");

/**
 * @swagger
 * tags:
 *   name: Company
 *   description: Company Management APIs
 */

/**
 * @swagger
 * /api/company/signup:
 *   post:
 *     summary: Register a new company
 *     tags: [Company]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - companyName
 *               - email
 *               - password
 *             properties:
 *               companyName:
 *                 type: string
 *                 example: Google India
 *               email:
 *                 type: string
 *                 example: hr@google.com
 *               password:
 *                 type: string
 *                 example: Password@123
 *     responses:
 *       201:
 *         description: Company registered successfully
 *       400:
 *         description: Invalid request or company already exists
 */
router.post("/signup", signupCompany);

/**
 * @swagger
 * /api/company/profile:
 *   post:
 *     summary: Create Company Profile
 *     tags: [Company]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Profile created successfully
 *       401:
 *         description: Unauthorized
 */
router.post("/profile", authenticateToken, createProfile);

/**
 * @swagger
 * /api/company/kyc:
 *   post:
 *     summary: Submit Company KYC
 *     tags: [Company]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: KYC submitted successfully
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 */
router.post("/kyc", authenticateToken, submitKYC);

/**
 * @swagger
 * /api/company/relationships/{companyId}:
 *   get:
 *     summary: Get Company Relationship Overview
 *     tags: [Company]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Relationship overview fetched successfully
 *       404:
 *         description: Company not found
 */
router.get(
  "/relationships/:companyId",
  authenticateToken,
  getRelationshipOverview
);

/**
 * Activate company (simple endpoint for demonstration)
 */
router.post("/activate", authenticateToken, activateCompany);

module.exports = router;
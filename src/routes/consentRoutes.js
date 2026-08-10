const express = require("express");

const router = express.Router();

const {
    createConsent,
    getConsentsForSubject
} = require("../controllers/consentController");
const { authenticateToken } = require("../middleware/authMiddleware");

/**
 * @swagger
 * tags:
 *   name: Consents
 *   description: Consent capture and audit APIs
 */

router.post("/", authenticateToken, createConsent);
router.get("/:subjectType/:subjectId", authenticateToken, getConsentsForSubject);

module.exports = router;

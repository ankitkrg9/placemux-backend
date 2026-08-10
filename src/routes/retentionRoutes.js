const express = require("express");
const router = express.Router();
const {
    createRetentionPolicy,
    listRetentionPolicies,
    runRetention
} = require("../controllers/retentionController");
const { authenticateToken } = require("../middleware/authMiddleware");

/**
 * @swagger
 * tags:
 *   name: Retention
 *   description: Data retention policy management APIs
 */

router.post("/policies", authenticateToken, createRetentionPolicy);
router.get("/policies", authenticateToken, listRetentionPolicies);
router.post("/policies/:policyId/run", authenticateToken, runRetention);

module.exports = router;

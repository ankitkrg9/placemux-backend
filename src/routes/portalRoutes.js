const express = require("express");

const router = express.Router();

const {
    startPortalSession,
    completePortalSession,
    getPortalSession,
    dryRunPortalSession
} = require("../controllers/portalController");
const { authenticateToken } = require("../middleware/authMiddleware");

/**
 * @swagger
 * tags:
 *   name: Portals
 *   description: Portal integration and dry-run APIs
 */

router.post("/start", authenticateToken, startPortalSession);
router.post("/complete", authenticateToken, completePortalSession);
router.post("/dry-run", authenticateToken, dryRunPortalSession);
router.get("/:portalId", authenticateToken, getPortalSession);

module.exports = router;

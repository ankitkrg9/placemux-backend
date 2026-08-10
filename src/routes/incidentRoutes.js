const express = require("express");
const router = express.Router();
const { reportIncident, listIncidents } = require("../controllers/incidentController");
const { authenticateToken } = require("../middleware/authMiddleware");

/**
 * @swagger
 * tags:
 *   name: Incidents
 *   description: Incident reporting and tracking APIs
 */

router.post("/report", authenticateToken, reportIncident);
router.get("/", authenticateToken, listIncidents);

module.exports = router;

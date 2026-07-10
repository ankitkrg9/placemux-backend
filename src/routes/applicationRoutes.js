const express = require("express");

const router = express.Router();

const {
  applyJob
} = require("../controllers/applicationController");
const { authenticateToken } = require("../middleware/authMiddleware");
const { backgroundQueue } = require("../services/backgroundQueue");

router.post("/", authenticateToken, applyJob);
router.get("/queue/stats", authenticateToken, (req, res) => {
  res.json({
    success: true,
    stats: backgroundQueue.getStats()
  });
});

module.exports = router;
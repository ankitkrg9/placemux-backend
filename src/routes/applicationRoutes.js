const express = require("express");

const router = express.Router();

const {
  applyJob
} = require("../controllers/applicationController");
const { backgroundQueue } = require("../services/backgroundQueue");

router.post("/", applyJob);
router.get("/queue/stats", (req, res) => {
  res.json({
    success: true,
    stats: backgroundQueue.getStats()
  });
});

module.exports = router;
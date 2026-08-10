const express = require("express");

const router = express.Router();

const {
    getSubjectRights,
    eraseSubjectData
} = require("../controllers/rightsController");
const { authenticateToken } = require("../middleware/authMiddleware");

/**
 * @swagger
 * tags:
 *   name: Rights
 *   description: Data-subject rights and erasure APIs
 */

router.get("/:subjectType/:subjectId", authenticateToken, getSubjectRights);
router.delete("/:subjectType/:subjectId", authenticateToken, eraseSubjectData);

module.exports = router;

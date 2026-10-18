
const express = require("express");

const authenticateToken = require("../middleware/auth.middleware");
const authorizeRoles = require("../middleware/role.middleware");

const {
  getMyRequests,
  acceptRequest,
  updateRequestStatus,
} = require("../controllers/mechanicRequest.controller");

const router = express.Router();

// Only logged-in mechanics can access these routes.
router.use(authenticateToken, authorizeRoles("mechanic"));

router.get("/", getMyRequests);
router.patch("/:requestId/accept", acceptRequest);
router.patch("/:requestId/status", updateRequestStatus);

module.exports = router;

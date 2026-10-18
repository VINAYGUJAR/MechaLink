
const express = require("express");

const authenticateToken = require("../middleware/auth.middleware");
const authorizeRoles = require("../middleware/role.middleware");

const {
  createEmergencyRequest,
  getMyEmergencyRequests,
  cancelMyEmergencyRequest,
} = require("../controllers/emergencyRequest.controller");

const router = express.Router();

router.use(authenticateToken, authorizeRoles("customer"));

router.post("/", createEmergencyRequest);

// View only the logged-in customer's requests.
router.get("/", getMyEmergencyRequests);

router.patch("/:requestId/cancel", cancelMyEmergencyRequest);

module.exports = router;


const express = require("express");

const authenticateToken = require("../middleware/auth.middleware");
const authorizeRoles = require("../middleware/role.middleware");

const {
  verifyMechanic,
  getMechanics,
  getUsers,
  getDashboardStats,
} = require("../controllers/admin.controller");

const router = express.Router();

// Every route in this file requires an admin.
router.use(authenticateToken, authorizeRoles("admin"));

router.get("/mechanics", getMechanics);
router.get("/users", getUsers);
router.get("/dashboard/stats", getDashboardStats);
router.patch(
  "/mechanics/:mechanicId/verification",
  verifyMechanic
);

module.exports = router;

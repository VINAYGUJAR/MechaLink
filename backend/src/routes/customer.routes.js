
const express = require("express");

const authenticateToken = require("../middleware/auth.middleware");
const authorizeRoles = require("../middleware/role.middleware");

const {
  findNearbyMechanics,
} = require("../controllers/nearbyMechanic.controller");

const router = express.Router();

// Only authenticated customers can search for nearby mechanics.
router.use(authenticateToken, authorizeRoles("customer"));

router.get("/mechanics/nearby", findNearbyMechanics);

module.exports = router;

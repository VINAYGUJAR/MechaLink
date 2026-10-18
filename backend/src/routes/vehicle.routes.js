
const express = require("express");

const authenticateToken = require("../middleware/auth.middleware");

const {
  addVehicle,
  getMyVehicles,
} = require("../controllers/vehicle.controller");

const router = express.Router();

router.post("/", authenticateToken, addVehicle);
router.get("/", authenticateToken, getMyVehicles);

module.exports = router;

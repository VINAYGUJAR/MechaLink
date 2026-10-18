
const express = require("express");

const authenticateToken = require("../middleware/auth.middleware");
const authorizeRoles = require("../middleware/role.middleware");

const {
  createMyProfile,
  getMyProfile,
  updateMyLocation,
} = require("../controllers/mechanic.controller");

const router = express.Router();

// Both authentication and mechanic role are required.
router.use(authenticateToken, authorizeRoles("mechanic"));

router.post("/me", createMyProfile);
router.get("/me", getMyProfile);
router.patch("/me/location", updateMyLocation);

module.exports = router;

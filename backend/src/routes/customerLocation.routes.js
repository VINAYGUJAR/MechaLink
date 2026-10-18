
const express = require("express");

const authenticateToken = require("../middleware/auth.middleware");
const authorizeRoles = require("../middleware/role.middleware");

const {
  saveMyLocation,
  getMyLocation,
} = require("../controllers/customerLocation.controller");

const router = express.Router();

// Only logged-in customers can access these routes.
router.use(authenticateToken, authorizeRoles("customer"));

router.put("/me", saveMyLocation);
router.get("/me", getMyLocation);

module.exports = router;

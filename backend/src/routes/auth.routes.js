const express = require("express");
const { register,
        login, 
        getMe,} = require("../controllers/auth.controller");

const authenticateToken = require("../middleware/auth.middleware");
const authorizeRoles = require("../middleware/role.middleware");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);

// Protected route
router.get("/me", authenticateToken, getMe);
 
router.get(
  "/mechanic-test",
  authenticateToken,
  authorizeRoles("mechanic"),
  (req, res) => {
    res.status(200).json({
      success: true,
      message: "Welcome to the mechanic area",
    });
  }
);


module.exports = router;
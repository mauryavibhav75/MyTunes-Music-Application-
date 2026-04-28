const express = require("express");
const router = express.Router();

const authController = require("../controllers/authController");
const { validateRegistration, validateLogin } = require("../middleware/validation");
const { authLimiter } = require("../middleware/rateLimiter");

/* AUTH ROUTES */

router.post("/register", authLimiter, validateRegistration, authController.register);

router.post("/login", authLimiter, validateLogin, authController.login);

router.post("/logout", (req, res) => {
  res.status(200).json({ success: true, message: "Logged out successfully" });
});

router.post("/forgot-password", authLimiter, authController.forgotPassword);

router.post("/refresh-token", authController.refreshToken);

module.exports = router;
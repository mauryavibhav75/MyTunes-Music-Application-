/* ==========================================
   MYTUNE AUTH CONTROLLER (NO EMAIL VERIFY)
========================================== */

const jwt = require("jsonwebtoken");
const { User } = require("../models");

/* ==========================================
   HELPER: GENERATE TOKENS
========================================== */

const generateAccessToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    { expiresIn: "24h" }
  );
};

const generateRefreshToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    { expiresIn: "30d" }
  );
};

/* ==========================================
   1️⃣ REGISTER
========================================== */

exports.register = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email or username already exists"
      });
    }

    // Create user (NO verification token)
    const user = await User.create({
      username,
      email,
      password,
      emailVerified: true // auto-verified
    });

    res.status(201).json({
      success: true,
      message: "Registration successful"
    });

  } catch (error) {
    next(error);
  }
};


/* ==========================================
   2️⃣ LOGIN
========================================== */

exports.login = async (req, res, next) => {
  try {
    const { email, password, rememberMe } = req.body;

    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    const accessToken = generateAccessToken(user._id);
    const refreshToken = rememberMe
      ? generateRefreshToken(user._id)
      : null;

    user.lastActive = new Date();
    await user.save();

    res.status(200).json({
      success: true,
      message: "Login successful",
      user: user.toJSON(),
      accessToken,
      refreshToken
    });

  } catch (error) {
    next(error);
  }
};


/* ==========================================
   3️⃣ FORGOT PASSWORD
========================================== */

exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Password reset feature coming soon"
    });

  } catch (error) {
    next(error);
  }
};


/* ==========================================
   4️⃣ REFRESH TOKEN
========================================== */

exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: "Refresh token required"
      });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);

    const newAccessToken = generateAccessToken(decoded.id);

    res.status(200).json({
      success: true,
      accessToken: newAccessToken
    });

  } catch (error) {
    res.status(401).json({
      success: false,
      message: "Invalid or expired refresh token"
    });
  }
};
/* ==========================================
   TOKEN GENERATOR
========================================== */

const jwt = require("jsonwebtoken");
const crypto = require("crypto");

exports.generateJWT = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    { expiresIn: "24h" }
  );
};

exports.generateRefreshToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    { expiresIn: "30d" }
  );
};

exports.generateVerificationToken = () => {
  return crypto.randomBytes(32).toString("hex");
};

exports.verifyJWT = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    throw new Error("Invalid or expired token");
  }
};
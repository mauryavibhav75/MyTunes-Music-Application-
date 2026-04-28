/* ==========================================
   GLOBAL ERROR HANDLER
========================================== */

const mongoose = require("mongoose");

module.exports = (err, req, res, next) => {

  console.error("🔥 Error:", err);

  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";

  /* ==========================================
     MONGOOSE VALIDATION ERROR
  =========================================== */
  if (err instanceof mongoose.Error.ValidationError) {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((val) => val.message)
      .join(", ");
  }

  /* ==========================================
     INVALID OBJECT ID
  =========================================== */
  if (err instanceof mongoose.Error.CastError) {
    statusCode = 400;
    message = "Invalid ID format";
  }

  /* ==========================================
     JWT ERROR
  =========================================== */
  if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid authentication token";
  }

  if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Authentication token expired";
  }

  /* ==========================================
     DUPLICATE KEY ERROR
  =========================================== */
  if (err.code === 11000) {
    statusCode = 400;
    message = "Duplicate field value entered";
  }

  /* ==========================================
     RESPONSE FORMAT
  =========================================== */

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack })
  });
};
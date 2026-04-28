/* ==========================================
   RATE LIMITERS
========================================== */

const rateLimit = require("express-rate-limit");

/* ==========================================
   AUTH LIMITER
   Strict: 5 requests per 15 minutes
========================================== */

exports.authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    message: "Too many authentication attempts. Please try again later."
  },
  standardHeaders: true,
  legacyHeaders: false
});


/* ==========================================
   GENERAL API LIMITER
   Moderate: 100 requests per 15 minutes
========================================== */

exports.apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    message: "Too many requests. Please slow down."
  }
});


/* ==========================================
   SEARCH LIMITER
   Generous: 50 requests per minute
========================================== */

exports.searchLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 50,
  message: {
    success: false,
    message: "Too many search requests. Please wait."
  }
});
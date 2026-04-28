/* ==========================================
   MYTUNE VALIDATION MIDDLEWARE
========================================== */

const { body, validationResult } = require("express-validator");

/* ==========================================
   GENERAL VALIDATION WRAPPER
========================================== */

exports.validate = (validations) => {
  return async (req, res, next) => {
    await Promise.all(validations.map((validation) => validation.run(req)));

    const errors = validationResult(req);

    if (errors.isEmpty()) {
      return next();
    }

    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array().map((err) => ({
        field: err.path,
        message: err.msg
      }))
    });
  };
};

/* ==========================================
   REGISTER VALIDATION
========================================== */

exports.validateRegistration = exports.validate([
  body("username")
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage("Username must be 3-20 characters")
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage("Username can only contain letters, numbers, underscore"),

  body("email")
    .isEmail()
    .withMessage("Invalid email format"),

  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters")
    .matches(/[A-Z]/)
    .withMessage("Password must contain at least one uppercase letter")
    .matches(/[0-9]/)
    .withMessage("Password must contain at least one number")
]);


/* ==========================================
   LOGIN VALIDATION
========================================== */

exports.validateLogin = exports.validate([
  body("email")
    .isEmail()
    .withMessage("Invalid email format"),

  body("password")
    .notEmpty()
    .withMessage("Password is required")
]);


/* ==========================================
   PLAYLIST VALIDATION
========================================== */

exports.validatePlaylist = exports.validate([
  body("name")
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage("Playlist name must be 3-100 characters"),

  body("description")
    .optional()
    .isLength({ max: 500 })
    .withMessage("Description cannot exceed 500 characters"),

  body("privacy")
    .optional()
    .isIn(["public", "friends-only", "private"])
    .withMessage("Invalid privacy setting")
]);


/* ==========================================
   SONG UPLOAD VALIDATION
========================================== */

exports.validateSongUpload = exports.validate([
  body("title")
    .notEmpty()
    .withMessage("Song title is required"),

  body("artist")
    .notEmpty()
    .withMessage("Artist name is required"),

  body("duration")
    .optional()
    .isNumeric()
    .withMessage("Duration must be numeric"),

  body("releaseYear")
    .optional()
    .isInt({ min: 1900 })
    .withMessage("Invalid release year")
]);
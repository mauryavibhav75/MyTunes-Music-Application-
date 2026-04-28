/* ==========================================
   FILE UPLOAD CONFIG (MULTER)
========================================== */

const multer = require("multer");
const path = require("path");

/* Storage Config */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.mimetype.startsWith("image")) {
      cb(null, "uploads/images/");
    } else if (file.mimetype.startsWith("audio")) {
      cb(null, "uploads/audio/");
    } else {
      cb(new Error("Invalid file type"), null);
    }
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

/* File Filter */
const fileFilter = (req, file, cb) => {
  if (
    file.mimetype.startsWith("image") ||
    file.mimetype.startsWith("audio")
  ) {
    cb(null, true);
  } else {
    cb(new Error("Unsupported file type"), false);
  }
};

/* Limits */
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter
});

module.exports = {
  uploadImage: upload.single("image"),
  uploadAudio: upload.single("audio")
};
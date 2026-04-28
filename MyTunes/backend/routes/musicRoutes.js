const express = require("express");
const router = express.Router();

const musicController = require("../controllers/musicController");
const { authenticateToken, optionalAuth } = require("../middleware/auth");
const { searchLimiter } = require("../middleware/rateLimiter");

/* MUSIC ROUTES */

router.get("/search", searchLimiter, optionalAuth, musicController.searchSongs);

router.get("/trending", musicController.getTrendingSongs);

router.get("/genre/:genre", musicController.getSongsByGenre);

router.get("/:id", optionalAuth, musicController.getSongById);

router.get("/:id/stream", musicController.streamSong);

router.post("/:id/play", authenticateToken, musicController.logPlayEvent);

module.exports = router;
const express = require("express");
const router = express.Router();
const moodController = require("../controllers/moodController");

router.get("/:mood", moodController.generateMoodPlaylist);

module.exports = router;
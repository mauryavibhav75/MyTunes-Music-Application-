const express = require("express");
const router = express.Router();

const playlistController = require("../controllers/playlistController");
const { authenticateToken } = require("../middleware/auth");
const { validatePlaylist } = require("../middleware/validation");

/* PLAYLIST ROUTES */

router.get("/", authenticateToken, playlistController.getPlaylists);

router.get("/my", authenticateToken, playlistController.getPlaylists);

router.post("/", authenticateToken, validatePlaylist, playlistController.createPlaylist);

router.get("/:id", playlistController.getPlaylistById);

router.put("/:id", authenticateToken, validatePlaylist, playlistController.updatePlaylist);

router.delete("/:id", authenticateToken, playlistController.deletePlaylist);

router.post("/:id/songs", authenticateToken, playlistController.addSongsToPlaylist);

router.delete("/:id/songs/:songId", authenticateToken, playlistController.removeSongFromPlaylist);

router.put("/:id/reorder", authenticateToken, playlistController.reorderPlaylist);

router.post("/:id/copy", authenticateToken, playlistController.copyPlaylist);

module.exports = router;
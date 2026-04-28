const express = require("express");
const router = express.Router();

const userController = require("../controllers/userController");
const { authenticateToken } = require("../middleware/auth");

/* USER ROUTES */

router.get("/me", authenticateToken, userController.getProfile);

router.put("/me", authenticateToken, userController.updateProfile);

router.delete("/me", authenticateToken, userController.deleteAccount);

router.get("/me/liked", authenticateToken, userController.getLikedSongs);

router.post("/me/liked/:songId", authenticateToken, userController.likeSong);

router.delete("/me/liked/:songId", authenticateToken, userController.unlikeSong);

router.get("/search", authenticateToken, userController.searchUsers);

router.get("/:id", userController.getUserById);

module.exports = router;
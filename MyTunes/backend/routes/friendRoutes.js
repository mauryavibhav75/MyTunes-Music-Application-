const express = require("express");
const router = express.Router();

const friendsController = require("../controllers/friendsController");
const { authenticateToken } = require("../middleware/auth");

/* FRIEND ROUTES (ALL PROTECTED) */

router.use(authenticateToken);

router.get("/", friendsController.getFriends);

router.post("/request", friendsController.sendFriendRequest);

router.get("/requests", friendsController.getFriendRequests);

router.put("/request/:id/accept", friendsController.acceptFriendRequest);

router.put("/request/:id/decline", friendsController.declineFriendRequest);

router.delete("/:id", friendsController.removeFriend);

router.get("/suggestions", friendsController.getFriendSuggestions);

router.post("/block/:id", friendsController.blockUser);

module.exports = router;
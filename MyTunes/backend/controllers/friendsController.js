/* ==========================================
   MYTUNE FRIENDS CONTROLLER
========================================== */

const mongoose = require("mongoose");
const { User, Friendship, PlayHistory } = require("../models");

/* ==========================================
   HELPER: SEND MOCK NOTIFICATION
========================================== */

const sendNotification = (userId, message) => {
  console.log(`🔔 Notification to ${userId}: ${message}`);
};

/* ==========================================
   1️⃣ SEND FRIEND REQUEST
========================================== */

exports.sendFriendRequest = async (req, res, next) => {
  try {
    const { recipientId, message } = req.body;

    if (!mongoose.Types.ObjectId.isValid(recipientId)) {
      return res.status(400).json({ success: false, message: "Invalid user ID" });
    }

    if (recipientId === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: "Cannot friend yourself" });
    }

    const existing = await Friendship.findOne({
      $or: [
        { user1: req.user._id, user2: recipientId },
        { user1: recipientId, user2: req.user._id }
      ]
    });

    if (existing && existing.status === "accepted") {
      return res.status(400).json({ success: false, message: "Already friends" });
    }

    if (existing && existing.status === "pending") {
      return res.status(400).json({ success: false, message: "Request already pending" });
    }

    await Friendship.create({
      user1: req.user._id,
      user2: recipientId,
      initiatedBy: req.user._id,
      status: "pending",
      message
    });

    sendNotification(recipientId, "You have a new friend request");

    res.status(200).json({
      success: true,
      message: "Friend request sent"
    });

  } catch (error) {
    next(error);
  }
};


/* ==========================================
   2️⃣ GET PENDING FRIEND REQUESTS
========================================== */

exports.getFriendRequests = async (req, res, next) => {
  try {
    const requests = await Friendship.find({
      user2: req.user._id,
      status: "pending"
    }).populate("user1", "username profile.profilePicture");

    res.status(200).json({
      success: true,
      requests
    });

  } catch (error) {
    next(error);
  }
};


/* ==========================================
   3️⃣ ACCEPT FRIEND REQUEST
========================================== */

exports.acceptFriendRequest = async (req, res, next) => {
  try {
    const { id } = req.params;

    const request = await Friendship.findById(id);

    if (!request || request.status !== "pending") {
      return res.status(404).json({ success: false, message: "Request not found" });
    }

    if (!request.user2.equals(req.user._id)) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    request.status = "accepted";
    await request.save();

    sendNotification(request.user1, "Your friend request was accepted");

    res.status(200).json({
      success: true,
      message: "Friend request accepted"
    });

  } catch (error) {
    next(error);
  }
};


/* ==========================================
   4️⃣ DECLINE FRIEND REQUEST
========================================== */

exports.declineFriendRequest = async (req, res, next) => {
  try {
    const { id } = req.params;

    const request = await Friendship.findById(id);

    if (!request || request.status !== "pending") {
      return res.status(404).json({ success: false, message: "Request not found" });
    }

    if (!request.user2.equals(req.user._id)) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    await request.deleteOne();

    res.status(200).json({
      success: true,
      message: "Friend request declined"
    });

  } catch (error) {
    next(error);
  }
};


/* ==========================================
   5️⃣ GET FRIENDS LIST
========================================== */

exports.getFriends = async (req, res, next) => {
  try {
    const friendships = await Friendship.find({
      $or: [
        { user1: req.user._id },
        { user2: req.user._id }
      ],
      status: "accepted"
    }).populate("user1 user2", "username profile.profilePicture lastActive");

    const friends = friendships.map(f => {
      const friend = f.user1._id.equals(req.user._id) ? f.user2 : f.user1;
      return {
        _id: friend._id,
        username: friend.username,
        profilePicture: friend.profile?.profilePicture,
        online: friend.lastActive && (Date.now() - friend.lastActive < 5 * 60 * 1000)
      };
    });

    res.status(200).json({
      success: true,
      friends
    });

  } catch (error) {
    next(error);
  }
};


/* ==========================================
   6️⃣ REMOVE FRIEND
========================================== */

exports.removeFriend = async (req, res, next) => {
  try {
    const { id } = req.params;

    const friendship = await Friendship.findOne({
      $or: [
        { user1: req.user._id, user2: id },
        { user1: id, user2: req.user._id }
      ],
      status: "accepted"
    });

    if (!friendship) {
      return res.status(404).json({ success: false, message: "Friendship not found" });
    }

    await friendship.deleteOne();

    res.status(200).json({
      success: true,
      message: "Friend removed"
    });

  } catch (error) {
    next(error);
  }
};


/* ==========================================
   7️⃣ FRIEND SUGGESTIONS
========================================== */

exports.getFriendSuggestions = async (req, res, next) => {
  try {
    // Get current friends
    const friendships = await Friendship.find({
      $or: [
        { user1: req.user._id },
        { user2: req.user._id }
      ],
      status: "accepted"
    });

    const friendIds = friendships.map(f =>
      f.user1.equals(req.user._id) ? f.user2 : f.user1
    );

    // Find users not already friends
    const suggestions = await User.find({
      _id: {
        $ne: req.user._id,
        $nin: friendIds
      }
    })
      .select("username profile.profilePicture stats.friendsCount")
      .limit(10);

    res.status(200).json({
      success: true,
      suggestions
    });

  } catch (error) {
    next(error);
  }
};


/* ==========================================
   8️⃣ BLOCK USER
========================================== */

exports.blockUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    let friendship = await Friendship.findOne({
      $or: [
        { user1: req.user._id, user2: id },
        { user1: id, user2: req.user._id }
      ]
    });

    if (!friendship) {
      friendship = await Friendship.create({
        user1: req.user._id,
        user2: id,
        initiatedBy: req.user._id,
        status: "blocked"
      });
    } else {
      friendship.status = "blocked";
      await friendship.save();
    }

    res.status(200).json({
      success: true,
      message: "User blocked"
    });

  } catch (error) {
    next(error);
  }
};
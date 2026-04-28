/* ==========================================
   MYTUNE USER CONTROLLER
========================================== */

const mongoose = require("mongoose");
const { User, Playlist, Friendship, PlayHistory, ListeningSession, Song } = require("../models");

/* ==========================================
   1️⃣ GET CURRENT USER PROFILE
   GET /api/users/me
========================================== */

exports.getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select("-password");

    res.status(200).json({
      success: true,
      user
    });

  } catch (error) {
    next(error);
  }
};


/* ==========================================
   2️⃣ UPDATE PROFILE
   PUT /api/users/me
========================================== */

exports.updateProfile = async (req, res, next) => {
  try {
    const allowedFields = [
      "profile.displayName",
      "profile.bio",
      "profile.profilePicture",
      "profile.coverPhoto",
      "profile.location",
      "preferences"
    ];

    const updates = {};

    for (const key in req.body) {
      if (allowedFields.includes(key) || key.startsWith("profile.") || key === "preferences") {
        updates[key] = req.body[key];
      }
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select("-password");

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user
    });

  } catch (error) {
    next(error);
  }
};


/* ==========================================
   3️⃣ GET USER BY ID (PUBLIC PROFILE)
   GET /api/users/:id
========================================== */

exports.getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID"
      });
    }

    const user = await User.findById(id)
      .select("username profile stats achievements createdAt");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    res.status(200).json({
      success: true,
      user
    });

  } catch (error) {
    next(error);
  }
};


/* ==========================================
   4️⃣ SEARCH USERS
   GET /api/users/search?q=
========================================== */

exports.searchUsers = async (req, res, next) => {
  try {
    const query = req.query.q;

    if (!query) {
      return res.status(400).json({
        success: false,
        message: "Search query required"
      });
    }

    const users = await User.find({
      username: { $regex: query, $options: "i" },
      _id: { $ne: req.user._id }
    })
      .select("username profile.displayName profile.profilePicture stats.friendsCount")
      .limit(20);

    res.status(200).json({
      success: true,
      results: users
    });

  } catch (error) {
    next(error);
  }
};


/* ==========================================
   5️⃣ DELETE ACCOUNT
   DELETE /api/users/me
========================================== */

exports.deleteAccount = async (req, res, next) => {
  try {
    const { hardDelete } = req.query;

    if (hardDelete === "true") {

      // Delete user data
      await Playlist.deleteMany({ owner: req.user._id });
      await Friendship.deleteMany({
        $or: [
          { user1: req.user._id },
          { user2: req.user._id }
        ]
      });
      await PlayHistory.deleteMany({ userId: req.user._id });
      await ListeningSession.deleteMany({ host: req.user._id });

      await User.findByIdAndDelete(req.user._id);

      return res.status(200).json({
        success: true,
        message: "Account permanently deleted"
      });

    } else {

      // Soft delete (deactivate account)
      await User.findByIdAndUpdate(req.user._id, {
        email: `deleted_${Date.now()}@mytune.com`,
        username: `deleted_${Date.now()}`,
        profile: {},
        emailVerified: false
      });

      return res.status(200).json({
        success: true,
        message: "Account deactivated successfully"
      });
    }

  } catch (error) {
    next(error);
  }
};


/* ==========================================
   6️⃣ GET LIKED SONGS
   GET /api/users/me/liked
========================================== */

exports.getLikedSongs = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select("likedSongs");
    res.status(200).json({ success: true, liked: user.likedSongs || [] });
  } catch (error) {
    next(error);
  }
};


/* ==========================================
   7️⃣ LIKE A SONG
   POST /api/users/me/liked/:songId
========================================== */

exports.likeSong = async (req, res, next) => {
  try {
    const { songId } = req.params;
    const songData = req.body.song || {};

    const user = await User.findById(req.user._id).select("likedSongs");
    const alreadyLiked = user.likedSongs.some(s => String(s.id || s._id) === String(songId));
    if (alreadyLiked) {
      return res.status(200).json({ success: true, message: "Already liked" });
    }

    const songToStore = { id: songId, ...songData };
    user.likedSongs.push(songToStore);
    await user.save();

    res.status(200).json({ success: true, message: "Song liked" });
  } catch (error) {
    next(error);
  }
};


/* ==========================================
   8️⃣ UNLIKE A SONG
   DELETE /api/users/me/liked/:songId
========================================== */

exports.unlikeSong = async (req, res, next) => {
  try {
    const { songId } = req.params;

    await User.findByIdAndUpdate(req.user._id, {
      $pull: { likedSongs: { id: String(songId) } }
    });

    res.status(200).json({ success: true, message: "Song unliked" });
  } catch (error) {
    next(error);
  }
};


/* ==========================================
   9️⃣ UPDATE LAST ACTIVE
   (Internal use)
========================================== */

exports.updateLastActive = async (userId) => {
  try {
    await User.findByIdAndUpdate(userId, {
      lastActive: new Date()
    });
  } catch (error) {
    console.error("Failed to update lastActive:", error.message);
  }
};
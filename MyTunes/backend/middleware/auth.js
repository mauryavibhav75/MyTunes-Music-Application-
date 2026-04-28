/* ==========================================
   MYTUNE AUTH & AUTHORIZATION MIDDLEWARE
========================================== */

const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const { User, Playlist, Friendship } = require("../models");

/* ==========================================
   1️⃣ AUTHENTICATE TOKEN (REQUIRED)
========================================== */

exports.authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication required. No token provided."
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid token. User not found."
      });
    }

    req.user = user;
    next();

  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token expired. Please login again."
      });
    }

    return res.status(401).json({
      success: false,
      message: "Invalid authentication token."
    });
  }
};


/* ==========================================
   2️⃣ OPTIONAL AUTH
   (Doesn't fail if no token)
========================================== */

exports.optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next(); // continue without user
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");

    if (user) {
      req.user = user;
    }

    next();

  } catch (error) {
    // Ignore errors in optional auth
    next();
  }
};


/* ==========================================
   3️⃣ CHECK OWNERSHIP
   (For playlists or other owned resources)
========================================== */

exports.checkOwnership = (modelName, paramKey = "id") => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params[paramKey];

      if (!mongoose.Types.ObjectId.isValid(resourceId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid resource ID."
        });
      }

      let Model;

      switch (modelName) {
        case "Playlist":
          Model = Playlist;
          break;
        default:
          return res.status(500).json({
            success: false,
            message: "Ownership model not supported."
          });
      }

      const resource = await Model.findById(resourceId);

      if (!resource) {
        return res.status(404).json({
          success: false,
          message: "Resource not found."
        });
      }

      if (!resource.owner.equals(req.user._id)) {
        return res.status(403).json({
          success: false,
          message: "Access denied. You are not the owner."
        });
      }

      req.resource = resource;
      next();

    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Ownership verification failed."
      });
    }
  };
};


/* ==========================================
   4️⃣ CHECK FRIENDSHIP
========================================== */

exports.checkFriendship = async (req, res, next) => {
  try {
    const targetUserId = req.params.userId;

    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID."
      });
    }

    const friendship = await Friendship.findOne({
      $or: [
        { user1: req.user._id, user2: targetUserId },
        { user1: targetUserId, user2: req.user._id }
      ],
      status: "accepted"
    });

    if (!friendship) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You are not friends."
      });
    }

    next();

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Friendship verification failed."
    });
  }
};
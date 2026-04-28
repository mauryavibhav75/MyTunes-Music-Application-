const mongoose = require("mongoose");

const friendshipSchema = new mongoose.Schema(
  {
    user1: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    user2: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    status: {
      type: String,
      enum: ["pending", "accepted", "declined", "blocked"],
      default: "pending"
    },

    initiatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },

    message: {
      type: String,
      maxlength: 200
    }
  },
  {
    timestamps: true
  }
);

/* ==========================================
   COMPOUND INDEX
========================================== */

// Prevent duplicate friendships
friendshipSchema.index({ user1: 1, user2: 1 }, { unique: true });

/* ==========================================
   STATIC METHOD
========================================== */

friendshipSchema.statics.areFriends = async function (userA, userB) {
  return await this.findOne({
    $or: [
      { user1: userA, user2: userB },
      { user1: userB, user2: userA }
    ],
    status: "accepted"
  });
};

module.exports = mongoose.model("Friendship", friendshipSchema);
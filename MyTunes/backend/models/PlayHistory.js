const mongoose = require("mongoose");

const playHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    songId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Song",
      required: true,
      index: true
    },

    playedAt: {
      type: Date,
      required: true,
      default: Date.now,
      index: true
    },

    duration: {
      type: Number, // seconds actually played
      min: 0
    },

    completedPercentage: {
      type: Number,
      min: 0,
      max: 100
    },

    source: {
      type: String,
      enum: ["playlist", "search", "radio", "friend-activity", "session"],
      default: "search"
    },

    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ListeningSession"
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false }
  }
);

/* ==========================================
   INDEXES
========================================== */

// Compound index for fast user history queries
playHistorySchema.index({ userId: 1, playedAt: -1 });

// TTL INDEX - auto delete after 90 days
playHistorySchema.index(
  { playedAt: 1 },
  { expireAfterSeconds: 90 * 24 * 60 * 60 } // 90 days
);

/* ==========================================
   METHODS
========================================== */

// Determine if user completed song
playHistorySchema.methods.isCompleted = function () {
  return this.completedPercentage >= 90;
};

module.exports = mongoose.model("PlayHistory", playHistorySchema);
const mongoose = require("mongoose");

const participantSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  joinedAt: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { _id: false });

const listeningSessionSchema = new mongoose.Schema({
  host: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  name: {
    type: String,
    trim: true
  },

  mode: {
    type: String,
    enum: ["public", "private", "friends"],
    default: "public"
  },

  participants: [participantSchema],

  currentSong: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Song"
  },

  queue: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Song"
    }
  ],

  playbackPosition: {
    type: Number,
    default: 0
  },

  isPlaying: {
    type: Boolean,
    default: false
  },

  lastActivity: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

/* ==========================================
   INDEXES
========================================== */

listeningSessionSchema.index({ host: 1 });
listeningSessionSchema.index({ mode: 1 });
listeningSessionSchema.index({ "participants.userId": 1 });

/* ==========================================
   METHODS
========================================== */

listeningSessionSchema.methods.addParticipant = function (userId) {
  if (!this.participants.find(p => p.userId.equals(userId))) {
    this.participants.push({ userId });
  }
  return this.save();
};

module.exports = mongoose.model("ListeningSession", listeningSessionSchema);
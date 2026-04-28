const mongoose = require("mongoose");

const collaboratorSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  permission: {
    type: String,
    enum: ["viewer", "editor"],
    default: "editor"
  }
}, { _id: false });

const playlistSongSchema = new mongoose.Schema({
  songId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Song",
    required: true
  },
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  addedAt: {
    type: Date,
    default: Date.now
  },
  order: {
    type: Number,
    required: true
  },
  votes: {
    type: Number,
    default: 0
  }
}, { _id: false });

const playlistSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Playlist name is required"],
      minlength: 3,
      maxlength: 100,
      trim: true
    },

    description: {
      type: String,
      maxlength: 500
    },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    coverImage: {
      type: String
    },

    privacy: {
      type: String,
      enum: ["public", "friends-only", "private"],
      default: "public"
    },

    collaborative: {
      type: Boolean,
      default: false
    },

    collaborators: [collaboratorSchema],

    songs: [playlistSongSchema],

    tags: [
      {
        type: String,
        trim: true
      }
    ],

    stats: {
      totalPlays: { type: Number, default: 0 },
      followers: { type: Number, default: 0 },
      copies: { type: Number, default: 0 }
    }
  },
  {
    timestamps: true
  }
);

/* ==========================================
   INDEXES
========================================== */

playlistSchema.index({ owner: 1 });
playlistSchema.index({ privacy: 1 });
playlistSchema.index({ tags: 1 });

/* ==========================================
   METHODS
========================================== */

playlistSchema.methods.addSong = function (songId, userId) {
  this.songs.push({
    songId,
    addedBy: userId,
    order: this.songs.length
  });
  return this.save();
};

module.exports = mongoose.model("Playlist", playlistSchema);
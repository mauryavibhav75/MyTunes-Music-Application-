const mongoose = require("mongoose");

const songSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Song title is required"],
      trim: true
    },

    artist: {
      type: String,
      required: [true, "Artist name is required"],
      trim: true
    },

    album: {
      type: String,
      trim: true
    },

    duration: {
      type: Number, // seconds
      min: 0
    },

    releaseYear: {
      type: Number,
      min: 1900,
      max: new Date().getFullYear()
    },

    genre: [
      {
        type: String,
        trim: true
      }
    ],

    mood: [
      {
        type: String,
        trim: true
      }
    ],

    audioFileUrl: {
      type: String,
      required: [true, "Audio file URL is required"]
    },

    coverArtUrl: {
      type: String
    },

    lyrics: {
      synchronized: {
        type: Boolean,
        default: false
      },
      lrcData: {
        type: String
      },
      contributor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    },

    metadata: {
      tempo: { type: Number }, // BPM
      energy: { type: Number, min: 0, max: 1 },
      danceability: { type: Number, min: 0, max: 1 },
      valence: { type: Number, min: 0, max: 1 }
    },

    stats: {
      totalPlays: { type: Number, default: 0 },
      uniqueListeners: { type: Number, default: 0 }
    }
  },
  {
    timestamps: true
  }
);

/* ==========================================
   INDEXES
========================================== */

songSchema.index({ title: "text", artist: "text", album: "text" });
songSchema.index({ genre: 1 });
songSchema.index({ releaseYear: 1 });

/* ==========================================
   VIRTUALS
========================================== */

songSchema.virtual("formattedDuration").get(function () {
  const mins = Math.floor(this.duration / 60);
  const secs = this.duration % 60;
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
});

module.exports = mongoose.model("Song", songSchema);
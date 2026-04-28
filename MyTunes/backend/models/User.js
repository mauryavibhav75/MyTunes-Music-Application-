const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 20,
      match: /^[a-zA-Z0-9_]+$/
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    },

    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 8,
      select: false
    },

    profile: {
      displayName: {
        type: String,
        trim: true
      },
      bio: {
        type: String,
        maxlength: 200
      },
      profilePicture: {
        type: String
      },
      coverPhoto: {
        type: String
      },
      location: {
        type: String
      }
    },

    preferences: {
      darkMode: { type: Boolean, default: true },
      language: { type: String, default: "en" },
      autoplay: { type: Boolean, default: true },
      downloadQuality: {
        type: String,
        enum: ["low", "medium", "high"],
        default: "high"
      }
    },

    stats: {
      totalPlays: { type: Number, default: 0 },
      totalListeningTime: { type: Number, default: 0 },
      playlistsCreated: { type: Number, default: 0 },
      friendsCount: { type: Number, default: 0 }
    },

    achievements: [
      {
        type: String
      }
    ],

    emailVerified: {
      type: Boolean,
      default: false
    },

    verificationToken: {
      type: String
    },

    resetPasswordToken: {
      type: String
    },

    resetPasswordExpires: {
      type: Date
    },

    likedSongs: [{
      type: mongoose.Schema.Types.Mixed
    }],

    lastActive: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

/* ==========================================
   INDEXES
========================================== */

userSchema.index({ username: 1 });
userSchema.index({ email: 1 });

/* ==========================================
   PASSWORD HASHING
========================================== */

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

/* ==========================================
   PASSWORD COMPARISON METHOD
========================================== */

userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

/* ==========================================
   REMOVE SENSITIVE DATA
========================================== */

userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  delete user.resetPasswordToken;
  delete user.resetPasswordExpires;
  delete user.verificationToken;
  return user;
};

module.exports = mongoose.model("User", userSchema);
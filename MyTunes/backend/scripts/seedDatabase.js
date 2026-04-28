require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const connectDB = require("../config/database");
const { User, Song, Playlist, Friendship } = require("../models");

const seedDatabase = async () => {
  try {
    await connectDB();

    console.log("🧹 Clearing existing data...");
    await User.deleteMany();
    await Song.deleteMany();
    await Playlist.deleteMany();
    await Friendship.deleteMany();

    /* ================= USERS ================= */

    const users = [];

    for (let i = 1; i <= 10; i++) {
      const user = await User.create({
        username: `user${i}`,
        email: `user${i}@mytune.com`,
        password: "Password123",
        emailVerified: true
      });
      users.push(user);
    }

    console.log("👤 Users created");

    /* ================= SONGS ================= */

    const genres = ["Pop", "Rock", "Hip-Hop", "Jazz", "EDM"];

    const songs = [];

    for (let i = 1; i <= 50; i++) {
      const song = await Song.create({
        title: `Song ${i}`,
        artist: `Artist ${i}`,
        duration: Math.floor(Math.random() * 300),
        genre: [genres[i % genres.length]],
        audioFileUrl: "uploads/sample.mp3"
      });
      songs.push(song);
    }

    console.log("🎵 Songs created");

    /* ================= PLAYLISTS ================= */

    for (let i = 1; i <= 20; i++) {
      await Playlist.create({
        name: `Playlist ${i}`,
        owner: users[i % users.length]._id,
        songs: songs.slice(i, i + 5).map((song, index) => ({
          songId: song._id,
          addedBy: users[i % users.length]._id,
          order: index
        }))
      });
    }

    console.log("📀 Playlists created");

    /* ================= FRIENDSHIPS ================= */

    for (let i = 0; i < users.length - 1; i++) {
      await Friendship.create({
        user1: users[i]._id,
        user2: users[i + 1]._id,
        status: "accepted",
        initiatedBy: users[i]._id
      });
    }

    console.log("👥 Friendships created");

    console.log("✅ Database seeded successfully!");
    process.exit(0);

  } catch (error) {
    console.error("🔥 Seed error:", error);
    process.exit(1);
  }
};

seedDatabase();
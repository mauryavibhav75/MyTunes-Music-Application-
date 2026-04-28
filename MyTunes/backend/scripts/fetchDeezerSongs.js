const axios = require("axios");
const mongoose = require("mongoose");
require("dotenv").config();

const Song = require("../models/Song");

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log(err));

async function fetchSongs() {
  try {

    // Fetch top 100 songs
    const response = await axios.get(
      "https://api.deezer.com/chart/0/tracks"
    );

    const tracks = response.data.data;

    for (let track of tracks) {

      await Song.create({
        title: track.title,
        artist: track.artist.name,
        genre: "Pop",
        mood: "Happy",
        audioUrl: track.preview, // 30 sec preview
        coverUrl: track.album.cover_medium
      });

      console.log("Added:", track.title);
    }

    console.log("Songs imported successfully 🎵");
    process.exit();

  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

fetchSongs();
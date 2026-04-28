/* ==========================================
   MYTUNE MUSIC CONTROLLER
========================================== */

const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const { Song, PlayHistory, User } = require("../models");

/* ==========================================
   1️⃣ SEARCH SONGS
   GET /api/songs/search?q=
========================================== */

exports.searchSongs = async (req, res, next) => {
  try {
    const {
      q,
      genre,
      year,
      mood,
      page = 1,
      limit = 20,
      sort = "createdAt"
    } = req.query;

    const query = {};

    if (q) {
      query.$text = { $search: q };
    }

    if (genre) query.genre = genre;
    if (year) query.releaseYear = Number(year);
    if (mood) query.mood = mood;

    const songs = await Song.find(query)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.status(200).json({
      success: true,
      page: Number(page),
      results: songs.length,
      songs
    });

  } catch (error) {
    next(error);
  }
};


/* ==========================================
   2️⃣ GET SONG BY ID
========================================== */

exports.getSongById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid ID" });
    }

    const song = await Song.findById(id);

    if (!song) {
      return res.status(404).json({ success: false, message: "Song not found" });
    }

    // Increment play count view
    song.stats.totalPlays += 1;
    await song.save();

    res.status(200).json({
      success: true,
      song
    });

  } catch (error) {
    next(error);
  }
};


/* ==========================================
   3️⃣ STREAM SONG (WITH RANGE SUPPORT)
========================================== */

exports.streamSong = async (req, res, next) => {
  try {
    const { id } = req.params;

    const song = await Song.findById(id);

    if (!song) {
      return res.status(404).json({ success: false, message: "Song not found" });
    }

    const filePath = path.resolve(song.audioFileUrl);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: "Audio file not found" });
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    res.setHeader("Cache-Control", "public, max-age=3600");

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      const chunkSize = end - start + 1;
      const file = fs.createReadStream(filePath, { start, end });

      res.writeHead(206, {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunkSize,
        "Content-Type": "audio/mpeg"
      });

      file.pipe(res);

    } else {
      res.writeHead(200, {
        "Content-Length": fileSize,
        "Content-Type": "audio/mpeg"
      });

      fs.createReadStream(filePath).pipe(res);
    }

  } catch (error) {
    next(error);
  }
};


/* ==========================================
   4️⃣ LOG PLAY EVENT
========================================== */

exports.logPlayEvent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { duration, completedPercentage, source } = req.body;

    const song = await Song.findById(id);

    if (!song) {
      return res.status(404).json({ success: false, message: "Song not found" });
    }

    await PlayHistory.create({
      userId: req.user._id,
      songId: id,
      duration,
      completedPercentage,
      source
    });

    // Update song stats
    song.stats.totalPlays += 1;
    await song.save();

    // Update user stats
    await User.findByIdAndUpdate(req.user._id, {
      $inc: {
        "stats.totalPlays": 1,
        "stats.totalListeningTime": duration
      }
    });

    res.status(200).json({
      success: true,
      message: "Play event logged"
    });

  } catch (error) {
    next(error);
  }
};


/* ==========================================
   5️⃣ GET SONGS BY GENRE
========================================== */

exports.getSongsByGenre = async (req, res, next) => {
  try {
    const { genre } = req.params;
    const { page = 1, limit = 20, sort = "stats.totalPlays" } = req.query;

    const songs = await Song.find({ genre })
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.status(200).json({
      success: true,
      songs
    });

  } catch (error) {
    next(error);
  }
};


/* ==========================================
   6️⃣ TRENDING SONGS (LAST 7 DAYS)
========================================== */

const axios = require("axios");

// Bollywood / Hindi artists to rotate through for variety
const HINDI_QUERIES = [
  "arijit singh",
  "shreya ghoshal",
  "atif aslam",
  "jubin nautiyal",
  "neha kakkar",
  "badshah hindi",
  "bollywood 2024",
  "kumar sanu",
  "lata mangeshkar",
  "sonu nigam",
];

exports.getTrendingSongs = async (req, res) => {
  try {
    // Pick a random Hindi query for variety, fall back to env var
    const query = process.env.DEEZER_SEARCH_QUERY ||
      HINDI_QUERIES[Math.floor(Math.random() * HINDI_QUERIES.length)];

    const response = await axios.get(
      "https://deezerdevs-deezer.p.rapidapi.com/search",
      {
        params: { q: query, limit: 25 },
        headers: {
          "X-RapidAPI-Key":  process.env.DEEZER_API_KEY,
          "X-RapidAPI-Host": "deezerdevs-deezer.p.rapidapi.com"
        }
      }
    );

    const songs = (response.data.data || [])
      .filter(track => track.preview) // only songs that have a playable preview
      .map(track => ({
        id:      track.id,
        title:   track.title,
        artist:  track.artist.name,
        preview: track.preview,
        cover:   track.album.cover_medium,
        album:   track.album.title,
        duration: track.duration
      }));

    res.json({
      success: true,
      songs
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch songs"
    });
  }
};
/* ==========================================
   MOOD CONTROLLER
========================================== */

const Song  = require("../models/Song");
const axios = require("axios");
const { successResponse, errorResponse } = require("../utils/responseFormatter");

/* ==========================================
   Hindi mood → Deezer search queries
========================================== */

const moodQueries = {
  happy:     ["khushi ke geet", "arijit singh happy", "neha kakkar dance"],
  sad:       ["arijit singh sad", "tere bina", "dard hindi songs"],
  energetic: ["badshah rap", "yo yo honey singh", "bollywood party hits"],
  calm:      ["shreya ghoshal soft", "lata mangeshkar", "instrumental hindi"],
  romantic:  ["arijit singh romantic", "atif aslam love", "hindi love songs"],
  angry:     ["raftaar rap", "hard hindi songs", "hindi rock"],
  motivated: ["motivational hindi songs", "jubin nautiyal", "sonu nigam upbeat"],
};

/* ==========================================
   Fetch from Deezer with a mood query
========================================== */

async function fetchDeezerMood(mood) {
  const queries = moodQueries[mood.toLowerCase()] || ["bollywood hits"];
  const query   = queries[Math.floor(Math.random() * queries.length)];

  const response = await axios.get(
    "https://deezerdevs-deezer.p.rapidapi.com/search",
    {
      params: { q: query, limit: 20 },
      headers: {
        "X-RapidAPI-Key":  process.env.DEEZER_API_KEY,
        "X-RapidAPI-Host": "deezerdevs-deezer.p.rapidapi.com"
      }
    }
  );

  return (response.data.data || [])
    .filter(t => t.preview)
    .map(t => ({
      id:       t.id,
      title:    t.title,
      artist:   t.artist.name,
      preview:  t.preview,
      cover:    t.album.cover_medium,
      album:    t.album.title,
      duration: t.duration
    }));
}

/* ==========================================
   Generate Mood Playlist
========================================== */

const VALID_MOODS = ["happy","sad","energetic","calm","romantic","angry","motivated"];

exports.generateMoodPlaylist = async (req, res) => {
  try {
    const mood = req.params.mood?.toLowerCase();

    if (!VALID_MOODS.includes(mood)) {
      return errorResponse(res, "Invalid mood category", 400);
    }

    // Try local DB first; fall back to Deezer
    let songs = await Song.find({}).limit(5);

    if (songs.length < 5) {
      songs = await fetchDeezerMood(mood);
    }

    return successResponse(res, `Generated ${mood} playlist`, songs);

  } catch (error) {
    return errorResponse(res, error.message);
  }
};
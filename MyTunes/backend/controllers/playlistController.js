/* ==========================================
   MYTUNE PLAYLIST CONTROLLER
========================================== */

const mongoose = require("mongoose");
const { Playlist, Song } = require("../models");

/* ==========================================
   HELPER: CHECK EDIT PERMISSION
========================================== */

const canEditPlaylist = (playlist, userId) => {
  if (playlist.owner.equals(userId)) return true;

  if (playlist.collaborative) {
    const collaborator = playlist.collaborators.find(c =>
      c.userId.equals(userId) && c.permission === "editor"
    );
    return !!collaborator;
  }

  return false;
};

/* ==========================================
   1️⃣ CREATE PLAYLIST
========================================== */

exports.createPlaylist = async (req, res, next) => {
  try {
    const { name, description, privacy, collaborative, tags } = req.body;

    const playlist = await Playlist.create({
      name,
      description,
      privacy,
      collaborative,
      tags,
      owner: req.user._id
    });

    res.status(201).json({
      success: true,
      playlist
    });

  } catch (error) {
    next(error);
  }
};


/* ==========================================
   2️⃣ GET USER PLAYLISTS
========================================== */

exports.getPlaylists = async (req, res, next) => {
  try {
    const playlists = await Playlist.find({
      $or: [
        { owner: req.user._id },
        { "collaborators.userId": req.user._id }
      ]
    }).populate("songs.songId", "title artist coverArtUrl duration");

    res.status(200).json({
      success: true,
      playlists
    });

  } catch (error) {
    next(error);
  }
};


/* ==========================================
   3️⃣ GET PLAYLIST BY ID
========================================== */

exports.getPlaylistById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const playlist = await Playlist.findById(id)
      .populate("songs.songId")
      .populate("owner", "username profile.displayName");

    if (!playlist) {
      return res.status(404).json({ success: false, message: "Playlist not found" });
    }

    // Privacy check
    if (playlist.privacy === "private" && !playlist.owner.equals(req.user?._id)) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    res.status(200).json({
      success: true,
      playlist
    });

  } catch (error) {
    next(error);
  }
};


/* ==========================================
   4️⃣ UPDATE PLAYLIST
========================================== */

exports.updatePlaylist = async (req, res, next) => {
  try {
    const { id } = req.params;

    const playlist = await Playlist.findById(id);

    if (!playlist) {
      return res.status(404).json({ success: false, message: "Playlist not found" });
    }

    if (!canEditPlaylist(playlist, req.user._id)) {
      return res.status(403).json({ success: false, message: "No edit permission" });
    }

    const allowedFields = ["name", "description", "privacy", "collaborative", "tags", "coverImage"];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        playlist[field] = req.body[field];
      }
    });

    await playlist.save();

    res.status(200).json({
      success: true,
      playlist
    });

  } catch (error) {
    next(error);
  }
};


/* ==========================================
   5️⃣ DELETE PLAYLIST
========================================== */

exports.deletePlaylist = async (req, res, next) => {
  try {
    const { id } = req.params;

    const playlist = await Playlist.findById(id);

    if (!playlist) {
      return res.status(404).json({ success: false, message: "Playlist not found" });
    }

    if (!playlist.owner.equals(req.user._id)) {
      return res.status(403).json({ success: false, message: "Only owner can delete" });
    }

    await playlist.deleteOne();

    res.status(200).json({
      success: true,
      message: "Playlist deleted successfully"
    });

  } catch (error) {
    next(error);
  }
};


/* ==========================================
   6️⃣ ADD SONGS
========================================== */

exports.addSongsToPlaylist = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { songIds } = req.body;

    const playlist = await Playlist.findById(id);

    if (!playlist) {
      return res.status(404).json({ success: false, message: "Playlist not found" });
    }

    if (!canEditPlaylist(playlist, req.user._id)) {
      return res.status(403).json({ success: false, message: "No edit permission" });
    }

    const currentOrder = playlist.songs.length;

    songIds.forEach((songId, index) => {
      playlist.songs.push({
        songId,
        addedBy: req.user._id,
        order: currentOrder + index
      });
    });

    await playlist.save();

    res.status(200).json({
      success: true,
      playlist
    });

  } catch (error) {
    next(error);
  }
};


/* ==========================================
   7️⃣ REMOVE SONG
========================================== */

exports.removeSongFromPlaylist = async (req, res, next) => {
  try {
    const { id, songId } = req.params;

    const playlist = await Playlist.findById(id);

    if (!playlist) {
      return res.status(404).json({ success: false, message: "Playlist not found" });
    }

    if (!canEditPlaylist(playlist, req.user._id)) {
      return res.status(403).json({ success: false, message: "No edit permission" });
    }

    playlist.songs = playlist.songs.filter(song => !song.songId.equals(songId));

    // Reorder
    playlist.songs.forEach((song, index) => {
      song.order = index;
    });

    await playlist.save();

    res.status(200).json({
      success: true,
      playlist
    });

  } catch (error) {
    next(error);
  }
};


/* ==========================================
   8️⃣ REORDER PLAYLIST
========================================== */

exports.reorderPlaylist = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { newOrder } = req.body; // array of songIds in new order

    const playlist = await Playlist.findById(id);

    if (!canEditPlaylist(playlist, req.user._id)) {
      return res.status(403).json({ success: false, message: "No edit permission" });
    }

    playlist.songs.forEach(song => {
      const index = newOrder.indexOf(song.songId.toString());
      if (index !== -1) song.order = index;
    });

    playlist.songs.sort((a, b) => a.order - b.order);

    await playlist.save();

    res.status(200).json({
      success: true,
      playlist
    });

  } catch (error) {
    next(error);
  }
};


/* ==========================================
   9️⃣ COPY PLAYLIST
========================================== */

exports.copyPlaylist = async (req, res, next) => {
  try {
    const { id } = req.params;

    const original = await Playlist.findById(id);

    if (!original) {
      return res.status(404).json({ success: false, message: "Playlist not found" });
    }

    // Privacy check
    if (original.privacy === "private" && !original.owner.equals(req.user._id)) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const newPlaylist = await Playlist.create({
      name: `${original.name} (Copy)`,
      description: original.description,
      owner: req.user._id,
      songs: original.songs.map(song => ({
        songId: song.songId,
        addedBy: req.user._id,
        order: song.order
      })),
      tags: original.tags
    });

    original.stats.copies += 1;
    await original.save();

    res.status(201).json({
      success: true,
      playlist: newPlaylist
    });

  } catch (error) {
    next(error);
  }
};
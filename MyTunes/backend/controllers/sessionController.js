/* ==========================================
   MYTUNE LISTENING SESSION CONTROLLER
========================================== */

const mongoose = require("mongoose");
const { ListeningSession, Friendship, User } = require("../models");

/* ==========================================
   HELPER: GENERATE SESSION CODE
========================================== */

const generateSessionCode = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

/* ==========================================
   1️⃣ CREATE SESSION
========================================== */

exports.createSession = async (req, res, next) => {
  try {
    const { name, mode } = req.body;

    const session = await ListeningSession.create({
      host: req.user._id,
      name: name || "My Listening Session",
      mode: mode || "public",
      participants: [{ userId: req.user._id }],
      sessionCode: generateSessionCode(),
      isPlaying: false
    });

    res.status(201).json({
      success: true,
      session
    });

  } catch (error) {
    next(error);
  }
};


/* ==========================================
   2️⃣ GET SESSION
========================================== */

exports.getSession = async (req, res, next) => {
  try {
    const session = await ListeningSession.findById(req.params.id)
      .populate("host", "username profile.profilePicture")
      .populate("participants.userId", "username profile.profilePicture");

    if (!session) {
      return res.status(404).json({ success: false, message: "Session not found" });
    }

    // Privacy check
    if (session.mode === "private" &&
        !session.host._id.equals(req.user._id)) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    res.status(200).json({
      success: true,
      session
    });

  } catch (error) {
    next(error);
  }
};


/* ==========================================
   3️⃣ JOIN SESSION
========================================== */

exports.joinSession = async (req, res, next) => {
  try {
    const session = await ListeningSession.findById(req.params.id);

    if (!session) {
      return res.status(404).json({ success: false, message: "Session not found" });
    }

    // Check if already joined
    if (!session.participants.find(p => p.userId.equals(req.user._id))) {
      session.participants.push({ userId: req.user._id });
      await session.save();
    }

    // Emit socket event
    req.io.to(session._id.toString()).emit("session:userJoined", {
      userId: req.user._id
    });

    res.status(200).json({
      success: true,
      session
    });

  } catch (error) {
    next(error);
  }
};


/* ==========================================
   4️⃣ LEAVE SESSION
========================================== */

exports.leaveSession = async (req, res, next) => {
  try {
    const session = await ListeningSession.findById(req.params.id);

    if (!session) {
      return res.status(404).json({ success: false, message: "Session not found" });
    }

    session.participants = session.participants.filter(
      p => !p.userId.equals(req.user._id)
    );

    // If host leaves
    if (session.host.equals(req.user._id)) {
      if (session.participants.length > 0) {
        // Transfer host
        session.host = session.participants[0].userId;
      } else {
        await session.deleteOne();
        return res.status(200).json({
          success: true,
          message: "Session ended"
        });
      }
    }

    await session.save();

    req.io.to(session._id.toString()).emit("session:userLeft", {
      userId: req.user._id
    });

    res.status(200).json({
      success: true,
      message: "Left session"
    });

  } catch (error) {
    next(error);
  }
};


/* ==========================================
   5️⃣ INVITE TO SESSION
========================================== */

exports.inviteToSession = async (req, res, next) => {
  try {
    const { userIds } = req.body;
    const session = await ListeningSession.findById(req.params.id);

    if (!session) {
      return res.status(404).json({ success: false, message: "Session not found" });
    }

    if (!session.host.equals(req.user._id)) {
      return res.status(403).json({ success: false, message: "Only host can invite" });
    }

    userIds.forEach(userId => {
      console.log(`🔔 Invite sent to ${userId} for session ${session._id}`);
    });

    res.status(200).json({
      success: true,
      message: "Invitations sent"
    });

  } catch (error) {
    next(error);
  }
};


/* ==========================================
   6️⃣ UPDATE SESSION QUEUE
========================================== */

exports.updateSessionQueue = async (req, res, next) => {
  try {
    const { queue } = req.body;
    const session = await ListeningSession.findById(req.params.id);

    if (!session) {
      return res.status(404).json({ success: false, message: "Session not found" });
    }

    if (!session.host.equals(req.user._id)) {
      return res.status(403).json({ success: false, message: "Only host can update queue" });
    }

    session.queue = queue;
    await session.save();

    req.io.to(session._id.toString()).emit("session:queueUpdated", {
      queue
    });

    res.status(200).json({
      success: true,
      session
    });

  } catch (error) {
    next(error);
  }
};


/* ==========================================
   7️⃣ GET ACTIVE SESSIONS
========================================== */

exports.getActiveSessions = async (req, res, next) => {
  try {
    const sessions = await ListeningSession.find({
      mode: "public"
    })
      .populate("host", "username profile.profilePicture")
      .select("name host participants createdAt");

    res.status(200).json({
      success: true,
      sessions
    });

  } catch (error) {
    next(error);
  }
};
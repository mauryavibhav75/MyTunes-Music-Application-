/* ==========================================
   MYTUNE BACKEND SERVER
========================================== */

require("dotenv").config();

const express = require("express");
const http = require("http");
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const { Server } = require("socket.io");

const connectDB = require("./config/database");
const logger = require("./utils/logger");

const app = express();
const server = http.createServer(app);

/* ==========================================
   DATABASE CONNECTION
========================================== */

if (process.env.NODE_ENV !== "test") {
  connectDB();
}

/* ==========================================
   SOCKET.IO SETUP
========================================== */

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL,
    credentials: true
  }
});

require("./config/socket")(io);

/* ==========================================
   GLOBAL MIDDLEWARE
========================================== */

app.use(helmet());

app.use(cors({
  origin: process.env.CLIENT_URL || "http://127.0.0.1:5500",
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
}));

// Static uploads
app.use("/uploads", express.static("uploads"));

/* ==========================================
   HEALTH CHECK
========================================== */

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    uptime: process.uptime(),
    timestamp: Date.now()
  });
});

/* ==========================================
   ROUTES
========================================== */

require("./routes")(app);

/* ==========================================
   GLOBAL ERROR HANDLER
========================================== */

const errorHandler = require("./middleware/errorHandler");
app.use(errorHandler);

/* ==========================================
   GRACEFUL SHUTDOWN
========================================== */

process.on("SIGTERM", async () => {
  logger.info("SIGTERM received. Shutting down gracefully...");
  server.close(() => {
    logger.info("Server closed.");
    process.exit(0);
  });
});

/* ==========================================
   START SERVER
========================================== */

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== "test") {
  server.listen(PORT, () => {
    logger.info(`🚀 Server running on port ${PORT}`);
  });
}

module.exports = app;
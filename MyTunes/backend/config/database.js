/* ==========================================
   DATABASE CONFIGURATION
========================================== */

const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      maxPoolSize: 10,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      retryWrites: true,
      w: "majority"
    });

    // ✅ Only log in non-test environments
    if (process.env.NODE_ENV !== "test") {
      console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    }

  } catch (error) {
    console.error("❌ MongoDB Connection Error:", error.message);
    process.exit(1);
  }
};

/* ==========================================
   CONNECTION EVENTS (Disable in test)
========================================== */

if (process.env.NODE_ENV !== "test") {

  mongoose.connection.on("connected", () => {
    console.log("📦 MongoDB connection established");
  });

  mongoose.connection.on("error", (err) => {
    console.error("🔥 MongoDB connection error:", err);
  });

  mongoose.connection.on("disconnected", () => {
    console.warn("⚠ MongoDB disconnected");
  });

  /* ==========================================
     GRACEFUL SHUTDOWN
  ========================================== */

  process.on("SIGINT", async () => {
    await mongoose.connection.close();
    console.log("🛑 MongoDB connection closed due to app termination");
    process.exit(0);
  });
}

module.exports = connectDB;
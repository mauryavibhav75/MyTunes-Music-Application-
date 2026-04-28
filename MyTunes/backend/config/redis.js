/* ==========================================
   REDIS CONFIGURATION
========================================== */

const Redis = require("ioredis");

const redis = new Redis({
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: process.env.REDIS_PORT || 6379,
  retryStrategy(times) {
    return Math.min(times * 50, 2000);
  }
});

redis.on("connect", () => {
  console.log("🔵 Redis Connected");
});

redis.on("error", (err) => {
  console.error("🔥 Redis Error:", err.message);
});

redis.on("close", () => {
  console.warn("⚠ Redis connection closed");
});

/* ==========================================
   HELPER FUNCTIONS
========================================== */

const get = async (key) => {
  return await redis.get(key);
};

const set = async (key, value, expiry = null) => {
  if (expiry) {
    return await redis.set(key, value, "EX", expiry);
  }
  return await redis.set(key, value);
};

const del = async (key) => {
  return await redis.del(key);
};

const expire = async (key, seconds) => {
  return await redis.expire(key, seconds);
};

module.exports = {
  redis,
  get,
  set,
  del,
  expire
};
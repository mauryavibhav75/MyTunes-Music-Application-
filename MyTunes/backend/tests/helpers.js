const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const jwt = require("jsonwebtoken");
const { User } = require("../models");

let mongoServer;

/* ==========================================
   SETUP TEST DATABASE
========================================== */

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();

  await mongoose.connect(uri);
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (let key in collections) {
    await collections[key].deleteMany();
  }
});

afterAll(async () => {
  await mongoose.connection.close();
  await mongoServer.stop();
});

/* ==========================================
   HELPER FUNCTIONS
========================================== */

const createTestUser = async () => {
  return await User.create({
    username: "testuser",
    email: "test@example.com",
    password: "Password123",
    emailVerified: true
  });
};

const generateTestToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: "1h"
  });
};

module.exports = {
  createTestUser,
  generateTestToken
};
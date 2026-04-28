const request = require("supertest");
const app = require("../server");
const { User } = require("../models");

describe("Auth API", () => {

  test("Register user successfully", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({
        username: "newuser",
        email: "new@example.com",
        password: "Password123"
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
  });

  test("Login user successfully", async () => {
    await User.create({
      username: "loginuser",
      email: "login@example.com",
      password: "Password123",
      emailVerified: true
    });

    const res = await request(app)
      .post("/api/auth/login")
      .send({
        email: "login@example.com",
        password: "Password123"
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.accessToken).toBeDefined();
  });

  test("Reject invalid login", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({
        email: "wrong@example.com",
        password: "wrongpass"
      });

    expect(res.statusCode).toBe(401);
  });

});
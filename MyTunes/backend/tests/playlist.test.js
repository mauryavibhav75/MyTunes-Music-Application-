const request = require("supertest");
const app = require("../server");
const { Playlist } = require("../models");
const { createTestUser, generateTestToken } = require("./helpers");

describe("Playlist API", () => {

  test("Create playlist (authorized)", async () => {
    const user = await createTestUser();
    const token = generateTestToken(user._id);

    const res = await request(app)
      .post("/api/playlists")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "My Playlist"
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.playlist.name).toBe("My Playlist");
  });

  test("Prevent unauthorized playlist creation", async () => {
    const res = await request(app)
      .post("/api/playlists")
      .send({ name: "Unauthorized Playlist" });

    expect(res.statusCode).toBe(401);
  });

});
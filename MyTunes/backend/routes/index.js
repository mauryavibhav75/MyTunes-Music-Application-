module.exports = (app) => {
  app.use("/api/auth", require("./authRoutes"));
  app.use("/api/users", require("./userRoutes"));
  app.use("/api/songs", require("./musicRoutes"));
  app.use("/api/playlists", require("./playlistRoutes"));
  app.use("/api/friends", require("./friendRoutes"));
  app.use("/api/sessions", require("./sessionRoutes"));
  app.use("/api/moods", require("./moodRoutes"));
};
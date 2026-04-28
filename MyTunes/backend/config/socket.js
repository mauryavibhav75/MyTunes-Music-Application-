module.exports = (io) => {
  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("session:join", (sessionId) => {
      socket.join(sessionId);
    });

    socket.on("session:broadcast", ({ sessionId, event, payload }) => {
      socket.to(sessionId).emit(`session:${event}`, payload);
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });
};
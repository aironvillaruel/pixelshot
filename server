// server.js
const { createServer } = require("http");
const { Server } = require("socket.io");
const next = require("next");

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => handle(req, res));
  const io = new Server(httpServer);

  const rooms = new Map(); // roomId -> array of socket ids

  io.on("connection", (socket) => {
    socket.on("join-room", (roomId) => {
      const room = rooms.get(roomId) ?? [];
      if (room.length >= 2) {
        socket.emit("room-full");
        return;
      }
      const isInitiator = room.length === 0;
      room.push(socket.id);
      rooms.set(roomId, room);
      socket.join(roomId);
      socket.data.roomId = roomId;

      socket.emit("joined", { isInitiator });
      socket.to(roomId).emit("peer-joined");
    });

    socket.on("signal", ({ roomId, data }) => {
      socket.to(roomId).emit("signal", { data });
    });

    socket.on("host-config", ({ roomId, config }) => {
      socket.to(roomId).emit("host-config", config);
    });

    socket.on("request-session", ({ roomId, config }) => {
      io.to(roomId).emit("session-start", config);
    });

    socket.on("disconnect", () => {
      const roomId = socket.data.roomId;
      if (!roomId) return;
      const remaining = (rooms.get(roomId) ?? []).filter((id) => id !== socket.id);
      remaining.length ? rooms.set(roomId, remaining) : rooms.delete(roomId);
      socket.to(roomId).emit("peer-left");
    });
  });

  httpServer.listen(3000, () => console.log("> Ready on http://localhost:3000"));
});
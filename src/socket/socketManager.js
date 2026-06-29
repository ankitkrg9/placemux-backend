const { Server } = require("socket.io");

let io;

const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    },
    transports: ["websocket", "polling"],
    pingTimeout: 20000,
    pingInterval: 10000
  });

  io.on("connection", (socket) => {
    const clientId = socket.handshake.query.clientId || socket.id;

    socket.data.clientId = clientId;

    socket.join(`client:${clientId}`);

    socket.emit("connected", {
      status: "ok",
      socketId: socket.id,
      clientId
    });

    socket.on("join-room", (room) => {
      if (typeof room === "string" && room.trim()) {
        socket.join(room);
        socket.emit("room-joined", { room });
      }
    });

    socket.on("leave-room", (room) => {
      if (typeof room === "string" && room.trim()) {
        socket.leave(room);
        socket.emit("room-left", { room });
      }
    });

    socket.on("ping", () => {
      socket.emit("pong", { socketId: socket.id });
    });

    socket.on("disconnect", (reason) => {
      socket.leaveAll();
      console.log(`Socket disconnected: ${socket.id} (${reason})`);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error("Socket.io has not been initialized");
  }

  return io;
};

const emitApplicationUpdate = (payload) => {
  const socketServer = getIO();
  socketServer.to(`client:${payload.clientId}`).emit("application-update", payload);
};

const emitCompanyUpdate = (companyId, payload) => {
  const socketServer = getIO();
  socketServer.to(`company:${companyId}`).emit("company-update", payload);
};

module.exports = {
  initializeSocket,
  getIO,
  emitApplicationUpdate,
  emitCompanyUpdate
};

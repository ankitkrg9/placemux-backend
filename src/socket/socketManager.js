const { Server } = require("socket.io");
const { createRealtimeEventStore } = require("../services/realtimeEventStore");

let io;
let eventStore;

const initializeSocket = (server) => {
  if (io) {
    return io;
  }

  eventStore = createRealtimeEventStore();

  io = new Server(server, {
    cors: {
      origin: (process.env.CORS_ALLOWED_ORIGINS || "https://app.example.com").split(",").map((origin) => origin.trim()).filter(Boolean),
      methods: ["GET", "POST"],
      credentials: true
    },
    transports: ["websocket", "polling"],
    pingTimeout: Number(process.env.SOCKET_PING_TIMEOUT_MS || 20000),
    pingInterval: Number(process.env.SOCKET_PING_INTERVAL_MS || 10000),
    allowEIO3: true
  });

  io.use((socket, next) => {
    const authHeader = socket.handshake.auth?.token || socket.handshake.headers?.authorization;
    const clientId = socket.handshake.query.clientId || socket.id;

    if (!authHeader) {
      const error = new Error("Authentication token required");
      error.data = { status: 401 };
      return next(error);
    }

    socket.data.clientId = clientId;
    socket.data.authenticated = true;
    next();
  });

  io.on("connection", (socket) => {
    const clientId = socket.data.clientId || socket.id;

    socket.join(`client:${clientId}`);

    socket.emit("connected", {
      status: "ok",
      socketId: socket.id,
      clientId,
      replayAvailable: true
    });

    socket.on("join-room", (room) => {
      if (typeof room === "string" && room.trim()) {
        socket.join(room);
        const replay = eventStore.getEvents(room);
        if (replay.length) {
          socket.emit("replay", { room, events: replay });
        }
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

    socket.on("reconnect-replay", ({ room, since = 0 }) => {
      const replay = eventStore.getEvents(room, since);
      socket.emit("replay", { room, events: replay });
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
  const room = `client:${payload.clientId}`;
  const event = {
    sequence: Date.now(),
    type: "application-update",
    payload
  };
  eventStore.addEvent(room, event);
  socketServer.to(room).emit("application-update", payload);
};

const emitCompanyUpdate = (companyId, payload) => {
  const socketServer = getIO();
  const room = `company:${companyId}`;
  const event = {
    sequence: Date.now(),
    type: "company-update",
    payload
  };
  eventStore.addEvent(room, event);
  socketServer.to(room).emit("company-update", payload);
};

const emitRealtimeEvent = (room, payload, type = "event") => {
  const socketServer = getIO();
  const event = {
    sequence: Date.now(),
    type,
    payload
  };
  eventStore.addEvent(room, event);
  socketServer.to(room).emit(type, payload);
};

const getEventStore = () => eventStore;

module.exports = {
  initializeSocket,
  getIO,
  emitApplicationUpdate,
  emitCompanyUpdate,
  emitRealtimeEvent,
  getEventStore
};

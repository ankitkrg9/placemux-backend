const { initializeSocket, emitApplicationUpdate, emitCompanyUpdate, emitRealtimeEvent, getEventStore } = require("../socket/socketManager");

const mockSocketServer = {
  on: jest.fn(),
  use: jest.fn(),
  to: jest.fn(() => ({ emit: jest.fn() }))
};

jest.mock("socket.io", () => ({
  Server: jest.fn(() => mockSocketServer)
}));

describe("Socket.IO integration", () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    mockSocketServer.on.mockReset();
    mockSocketServer.use.mockReset();
    mockSocketServer.to.mockReset();
    mockSocketServer.to.mockReturnValue({ emit: jest.fn() });
  });

  it("initializes the socket server and exposes it", () => {
    const server = {};
    const io = initializeSocket(server);

    expect(io).toBeDefined();
    expect(io.on).toHaveBeenCalled();
    expect(io.use).toHaveBeenCalled();
  });

  it("stores and replays events for reconnect recovery", () => {
    const server = {};
    initializeSocket(server);

    emitApplicationUpdate({ clientId: "client-1", status: "updated" });
    emitCompanyUpdate(42, { status: "ok" });
    emitRealtimeEvent("room:test", { message: "hello" }, "custom-event");

    const store = getEventStore();
    const events = store.getEvents("client:client-1");

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("application-update");
  });
});

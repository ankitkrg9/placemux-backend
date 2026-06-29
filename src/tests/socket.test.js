const { initializeSocket, getIO } = require("../socket/socketManager");

jest.mock("socket.io", () => ({
  Server: jest.fn(() => ({
    on: jest.fn(),
    to: jest.fn(() => ({ emit: jest.fn() }))
  }))
}));

describe("Socket.IO integration", () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it("initializes the socket server and exposes it", () => {
    const server = {};
    const io = initializeSocket(server);

    expect(io).toBeDefined();
    expect(io.on).toHaveBeenCalled();
  });
});

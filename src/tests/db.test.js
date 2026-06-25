const { Pool } = require("pg");

jest.mock("pg", () => {
  const mClient = {
    query: jest.fn(),
    release: jest.fn(),
  };

  const mPool = {
    connect: jest.fn(() => Promise.resolve(mClient)),
    on: jest.fn(),
  };

  return { Pool: jest.fn(() => mPool) };
});

const pool = require("../config/db");

describe("DB persistence helper", () => {
  it("commits a transaction on success", async () => {
    const client = {
      query: jest.fn().mockResolvedValue({}),
      release: jest.fn(),
    };

    Pool.mock.results[0].value.connect.mockResolvedValue(client);

    const result = await pool.withTransaction(async (boundClient) => {
      expect(boundClient).toBe(client);
      return "ok";
    });

    expect(result).toBe("ok");
    expect(client.query).toHaveBeenNthCalledWith(1, "BEGIN");
    expect(client.query).toHaveBeenNthCalledWith(2, "COMMIT");
    expect(client.release).toHaveBeenCalled();
  });

  it("rolls back a transaction when callback fails", async () => {
    const client = {
      query: jest.fn().mockResolvedValue({}),
      release: jest.fn(),
    };

    Pool.mock.results[0].value.connect.mockResolvedValue(client);

    await expect(
      pool.withTransaction(async () => {
        throw new Error("boom");
      })
    ).rejects.toThrow("boom");

    expect(client.query).toHaveBeenNthCalledWith(1, "BEGIN");
    expect(client.query).toHaveBeenNthCalledWith(2, "ROLLBACK");
    expect(client.release).toHaveBeenCalled();
  });

  it("maps unique constraint errors to 409", () => {
    const mapped = pool.mapDbError({ code: "23505" });
    expect(mapped).toEqual({
      status: 409,
      message: "A record with the same unique value already exists.",
    });
  });
});

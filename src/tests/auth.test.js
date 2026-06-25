const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

jest.mock("../config/db", () => ({
  query: jest.fn()
}));

const pool = require("../config/db");
const { loginCompany } = require("../controllers/authController");
const { authenticateToken } = require("../middleware/authMiddleware");

describe("Auth flows", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    process.env.JWT_SECRET = "test-secret";
  });

  it("returns a token when login credentials are valid", async () => {
    const passwordHash = await bcrypt.hash("StrongPass1", 10);

    pool.query.mockResolvedValue({
      rows: [
        {
          id: 1,
          email: "test@company.com",
          password_hash: passwordHash
        }
      ]
    });

    const req = {
      body: {
        email: "test@company.com",
        password: "StrongPass1"
      }
    };

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    await loginCompany(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalled();

    const response = res.json.mock.calls[0][0];
    expect(response).toHaveProperty("success", true);
    expect(response).toHaveProperty("token");
    expect(response.company).toEqual({
      id: 1,
      email: "test@company.com"
    });
  });

  it("rejects invalid login credentials", async () => {
    pool.query.mockResolvedValue({ rows: [] });

    const req = {
      body: {
        email: "missing@company.com",
        password: "password"
      }
    };

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    await loginCompany(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Invalid email or password"
    });
  });

  it("authenticates requests with a valid token", () => {
    const token = jwt.sign(
      {
        companyId: 1,
        email: "test@company.com",
        role: "company"
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    const req = {
      headers: {
        authorization: `Bearer ${token}`
      }
    };

    const next = jest.fn();
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    authenticateToken(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toMatchObject({
      companyId: 1,
      email: "test@company.com"
    });
  });

  it("rejects requests with an invalid token", () => {
    const req = {
      headers: {
        authorization: "Bearer invalid-token"
      }
    };

    const next = jest.fn();
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    authenticateToken(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Invalid or expired token"
    });
  });
});

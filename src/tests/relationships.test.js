const pool = require("../config/db");

jest.mock("../config/db", () => ({
  query: jest.fn(),
  withTransaction: jest.fn(),
  mapDbError: jest.fn((error) => ({
    status: 500,
    message: error.message || "Database error"
  }))
}));

const { getCompanyRelationshipOverview } = require("../services/relationshipService");

describe("relationship service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("builds a populated company overview from a single related-data query", async () => {
    pool.query.mockResolvedValue({
      rows: [
        {
          id: 7,
          company_name: "Altrodav",
          email: "team@altrodav.com",
          job_id: 11,
          title: "Backend Engineer",
          location: "Remote",
          application_count: 2,
          applied_applications: 1,
          rejected_threshold_applications: 1
        },
        {
          id: 7,
          company_name: "Altrodav",
          email: "team@altrodav.com",
          job_id: 12,
          title: "Frontend Engineer",
          location: "Hybrid",
          application_count: 1,
          applied_applications: 1,
          rejected_threshold_applications: 0
        }
      ]
    });

    const overview = await getCompanyRelationshipOverview(7);

    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining("FROM companies"), [7]);
    expect(overview).toEqual({
      id: 7,
      companyName: "Altrodav",
      email: "team@altrodav.com",
      jobs: [
        {
          id: 11,
          title: "Backend Engineer",
          location: "Remote",
          applicationCount: 2,
          appliedApplications: 1,
          rejectedThresholdApplications: 1
        },
        {
          id: 12,
          title: "Frontend Engineer",
          location: "Hybrid",
          applicationCount: 1,
          appliedApplications: 1,
          rejectedThresholdApplications: 0
        }
      ]
    });
  });
});

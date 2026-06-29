jest.mock("../config/db", () => ({
  query: jest.fn()
}));

let pool;
let getBaselineReport;

describe("Baseline report aggregation", () => {
  beforeEach(() => {
    jest.resetModules();
    jest.resetAllMocks();
    pool = require("../config/db");
    ({ getBaselineReport } = require("../services/analyticsService"));
  });

  it("aggregates core business metrics and exposes a metric dictionary", async () => {
    pool.query.mockResolvedValue({
      rows: [
        {
          total_companies: 5,
          total_jobs: 12,
          total_candidates: 34,
          total_applications: 20,
          applied_applications: 16,
          rejected_threshold_applications: 4
        }
      ]
    });

    const report = await getBaselineReport();

    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining("SELECT"), []);

    expect(report.grain).toBe("overall");
    expect(report.metrics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "total_companies",
          value: 5
        }),
        expect.objectContaining({
          name: "total_applications",
          value: 20
        }),
        expect.objectContaining({
          name: "application_acceptance_rate",
          value: 0.8
        })
      ])
    );

    expect(report.metricDictionary).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          metric: "total_applications"
        })
      ])
    );
  });

  it("reuses the cached report for repeat requests within the cache window", async () => {
    pool.query.mockResolvedValue({
      rows: [
        {
          total_companies: 5,
          total_jobs: 12,
          total_candidates: 34,
          total_applications: 20,
          applied_applications: 16,
          rejected_threshold_applications: 4
        }
      ]
    });

    await getBaselineReport();
    await getBaselineReport();

    expect(pool.query).toHaveBeenCalledTimes(1);
  });
});

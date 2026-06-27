const pool = require("../config/db");

const METRIC_DEFINITIONS = [
  {
    metric: "total_companies",
    definition: "Total number of companies registered in the platform.",
    source: "companies"
  },
  {
    metric: "total_jobs",
    definition: "Total number of jobs currently published.",
    source: "jobs"
  },
  {
    metric: "total_candidates",
    definition: "Total number of candidate profiles created.",
    source: "candidates"
  },
  {
    metric: "total_applications",
    definition: "Total application submissions regardless of outcome.",
    source: "applications"
  },
  {
    metric: "application_acceptance_rate",
    definition: "Share of applications that reached the applied state.",
    source: "applications"
  },
  {
    metric: "rejected_threshold_rate",
    definition: "Share of applications rejected because the candidate missed a skill threshold.",
    source: "applications"
  }
];

const getBaselineReport = async () => {
  const result = await pool.query(
    `
    SELECT
      COUNT(DISTINCT c.id)::int AS total_companies,
      COUNT(DISTINCT j.id)::int AS total_jobs,
      COUNT(DISTINCT ca.id)::int AS total_candidates,
      COUNT(DISTINCT a.id)::int AS total_applications,
      COUNT(DISTINCT CASE WHEN a.status = 'APPLIED' THEN a.id END)::int AS applied_applications,
      COUNT(DISTINCT CASE WHEN a.status = 'REJECTED_THRESHOLD' THEN a.id END)::int AS rejected_threshold_applications
    FROM companies c
    LEFT JOIN jobs j ON j.company_id = c.id
    LEFT JOIN candidates ca ON TRUE
    LEFT JOIN applications a ON TRUE
    `,
    []
  );

  const row = result.rows[0] || {};

  const metrics = [
    { name: "total_companies", value: Number(row.total_companies || 0), unit: "count" },
    { name: "total_jobs", value: Number(row.total_jobs || 0), unit: "count" },
    { name: "total_candidates", value: Number(row.total_candidates || 0), unit: "count" },
    { name: "total_applications", value: Number(row.total_applications || 0), unit: "count" },
    {
      name: "application_acceptance_rate",
      value: calculateRate(row.applied_applications || 0, row.total_applications || 0),
      unit: "ratio"
    },
    {
      name: "rejected_threshold_rate",
      value: calculateRate(row.rejected_threshold_applications || 0, row.total_applications || 0),
      unit: "ratio"
    }
  ];

  return {
    grain: "overall",
    generatedAt: new Date().toISOString(),
    metrics,
    metricDictionary: METRIC_DEFINITIONS
  };
};

const calculateRate = (numerator, denominator) => {
  if (!denominator) {
    return 0;
  }

  return Number((numerator / denominator).toFixed(4));
};

module.exports = {
  getBaselineReport,
  METRIC_DEFINITIONS
};

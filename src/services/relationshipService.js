const pool = require("../config/db");

const getCompanyRelationshipOverview = async (companyId) => {
  const result = await pool.query(
    `
    SELECT
      c.id,
      c.company_name,
      c.email,
      j.id AS job_id,
      j.title,
      j.location,
      COUNT(a.id)::int AS application_count,
      COUNT(CASE WHEN a.status = 'APPLIED' THEN 1 END)::int AS applied_applications,
      COUNT(CASE WHEN a.status = 'REJECTED_THRESHOLD' THEN 1 END)::int AS rejected_threshold_applications
    FROM companies c
    LEFT JOIN jobs j ON j.company_id = c.id
    LEFT JOIN applications a ON a.job_id = j.id
    WHERE c.id = $1
    GROUP BY c.id, c.company_name, c.email, j.id, j.title, j.location
    ORDER BY j.id
    `,
    [companyId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const rows = result.rows;
  const company = {
    id: rows[0].id,
    companyName: rows[0].company_name,
    email: rows[0].email,
    jobs: []
  };

  rows.forEach((row) => {
    if (row.job_id) {
      company.jobs.push({
        id: row.job_id,
        title: row.title,
        location: row.location,
        applicationCount: Number(row.application_count || 0),
        appliedApplications: Number(row.applied_applications || 0),
        rejectedThresholdApplications: Number(row.rejected_threshold_applications || 0)
      });
    }
  });

  return company;
};

module.exports = {
  getCompanyRelationshipOverview
};

const pool = require("../config/db");
const { incidentReportSchema } = require("../validators/incidentValidator");

const reportIncident = async (req, res) => {
    try {
        const validation = incidentReportSchema.safeParse(req.body);

        if (!validation.success) {
            return res.status(400).json({
                success: false,
                errors: validation.error.issues
            });
        }

        const { title, severity, status = "open", owner = null, summary = null } = validation.data;

        const result = await pool.query(
            `
      INSERT INTO incidents
      (title, severity, status, owner, summary)
      VALUES ($1,$2,$3,$4,$5)
      RETURNING *
      `,
            [title, severity, status, owner, summary]
        );

        res.status(201).json({
            success: true,
            incident: result.rows[0]
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Unable to report incident"
        });
    }
};

const listIncidents = async (req, res) => {
    try {
        const result = await pool.query(
            `
      SELECT *
      FROM incidents
      ORDER BY created_at DESC
      `
        );

        res.status(200).json({
            success: true,
            incidents: result.rows
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Unable to load incidents"
        });
    }
};

module.exports = {
    reportIncident,
    listIncidents
};

const { z } = require("zod");

const incidentReportSchema = z.object({
    title: z.string().min(5),
    severity: z.enum(["low", "medium", "high", "critical"]),
    status: z.enum(["open", "investigating", "resolved"]).optional(),
    owner: z.string().min(1).optional(),
    summary: z.string().optional()
});

module.exports = {
    incidentReportSchema
};

const { getBaselineReport, getCacheStats } = require("../services/analyticsService");

const getBaselineReportHandler = async (req, res) => {
  try {
    const report = await getBaselineReport();

    const cacheStats = getCacheStats();

    res.status(200).json({
      success: true,
      data: report,
      cache: {
        enabled: true,
        ttlMs: 30000,
        stats: cacheStats
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Unable to generate baseline report"
    });
  }
};

module.exports = {
  getBaselineReportHandler
};

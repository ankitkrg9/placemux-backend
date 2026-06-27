const { getBaselineReport } = require("../services/analyticsService");

const getBaselineReportHandler = async (req, res) => {
  try {
    const report = await getBaselineReport();

    res.status(200).json({
      success: true,
      data: report
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

const asyncHandler = require('../../../core/utils/asyncHandler');
const { HttpStatus } = require('../../../shared/constants/httpStatus.constants');

class AnalyticsController {
  constructor(analyticsService) {
    this.analyticsService = analyticsService;
  }

  getOverview = asyncHandler(async (req, res) => {
    const data = await this.analyticsService.getOverview(req.query);
    res.status(HttpStatus.OK).json({ success: true, data });
  });

  getRevenueTrends = asyncHandler(async (req, res) => {
    const data = await this.analyticsService.getRevenueTrends(req.query);
    res.status(HttpStatus.OK).json({ success: true, data });
  });

  getDoctorGrowth = asyncHandler(async (req, res) => {
    const data = await this.analyticsService.getDoctorGrowthTrends(req.query);
    res.status(HttpStatus.OK).json({ success: true, data });
  });

  getPatientGrowth = asyncHandler(async (req, res) => {
    const data = await this.analyticsService.getPatientGrowthTrends(req.query);
    res.status(HttpStatus.OK).json({ success: true, data });
  });

  getAppointmentGrowth = asyncHandler(async (req, res) => {
    const data = await this.analyticsService.getAppointmentGrowthTrends(req.query);
    res.status(HttpStatus.OK).json({ success: true, data });
  });
}

module.exports = AnalyticsController;

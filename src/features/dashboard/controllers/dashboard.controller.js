const asyncHandler = require('../../../core/utils/asyncHandler');
const { HttpStatus } = require('../../../shared/constants/httpStatus.constants');

class DashboardController {
  constructor(dashboardService) {
    this.dashboardService = dashboardService;
  }

  getAdminStats = asyncHandler(async (req, res) => {
    const stats = await this.dashboardService.getAdminStats(req.user);
    res.status(HttpStatus.OK).json({ success: true, data: { stats } });
  });
}

module.exports = DashboardController;

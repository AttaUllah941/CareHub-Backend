const { Router } = require('express');
const container = require('../../../core/container');
const { authenticate, authorize } = require('../../../core/middleware/auth.middleware');
const { UserRole } = require('../../../shared/enums/userRole.enum');

const router = Router();
const dashboardController = container.resolve('dashboardController');

router.get(
  '/admin',
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  dashboardController.getAdminStats,
);

module.exports = router;

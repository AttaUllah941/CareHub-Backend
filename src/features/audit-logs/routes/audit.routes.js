const { Router } = require('express');
const container = require('../../../core/container');
const validate = require('../../../core/middleware/validate.middleware');
const { authenticate, authorize } = require('../../../core/middleware/auth.middleware');
const { UserRole } = require('../../../shared/enums/userRole.enum');
const { mongoId, listAuditLogsQueryDto } = require('../dto/audit.dto');

const router = Router();
const auditController = container.resolve('auditController');

router.get(
  '/',
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  listAuditLogsQueryDto,
  validate,
  auditController.getLogs,
);

router.get(
  '/:id',
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  mongoId('id'),
  validate,
  auditController.getLogById,
);

module.exports = router;

const { Router } = require('express');
const container = require('../../../core/container');
const validate = require('../../../core/middleware/validate.middleware');
const { authenticate, authorize } = require('../../../core/middleware/auth.middleware');
const { UserRole } = require('../../../shared/enums/userRole.enum');
const {
  updateGeneralDto,
  updateEmailDto,
  updateSmsDto,
  updatePaymentDto,
  updateFeatureFlagsDto,
} = require('../dto/settings.dto');

const router = Router();
const settingsController = container.resolve('settingsController');

const adminRoles = [UserRole.SUPER_ADMIN, UserRole.ADMIN];

router.get('/public', settingsController.getPublicSettings);

router.get('/', authenticate, authorize(...adminRoles), settingsController.getSettings);

router.put('/general', authenticate, authorize(...adminRoles), updateGeneralDto, validate, settingsController.updateGeneral);
router.put('/email', authenticate, authorize(...adminRoles), updateEmailDto, validate, settingsController.updateEmail);
router.put('/sms', authenticate, authorize(...adminRoles), updateSmsDto, validate, settingsController.updateSms);
router.put('/payment', authenticate, authorize(...adminRoles), updatePaymentDto, validate, settingsController.updatePayment);
router.put(
  '/feature-flags',
  authenticate,
  authorize(...adminRoles),
  updateFeatureFlagsDto,
  validate,
  settingsController.updateFeatureFlags,
);

module.exports = router;

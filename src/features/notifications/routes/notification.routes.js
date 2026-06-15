const { Router } = require('express');
const container = require('../../../core/container');
const validate = require('../../../core/middleware/validate.middleware');
const { authenticate, authorize } = require('../../../core/middleware/auth.middleware');
const { UserRole } = require('../../../shared/enums/userRole.enum');
const {
  notificationIdParam,
  listNotificationsQueryDto,
  adminListNotificationsQueryDto,
  updatePreferencesDto,
} = require('../dto/notification.dto');

const router = Router();
const notificationController = container.resolve('notificationController');

router.get(
  '/me',
  authenticate,
  authorize(
    UserRole.PATIENT,
    UserRole.DOCTOR,
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.CLINIC_MANAGER,
  ),
  listNotificationsQueryDto,
  validate,
  notificationController.getMyNotifications,
);

router.get(
  '/me/unread-count',
  authenticate,
  authorize(
    UserRole.PATIENT,
    UserRole.DOCTOR,
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.CLINIC_MANAGER,
  ),
  notificationController.getUnreadCount,
);

router.patch(
  '/me/read-all',
  authenticate,
  authorize(
    UserRole.PATIENT,
    UserRole.DOCTOR,
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.CLINIC_MANAGER,
  ),
  notificationController.markAllAsRead,
);

router.get(
  '/preferences',
  authenticate,
  authorize(
    UserRole.PATIENT,
    UserRole.DOCTOR,
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.CLINIC_MANAGER,
  ),
  notificationController.getPreferences,
);

router.put(
  '/preferences',
  authenticate,
  authorize(
    UserRole.PATIENT,
    UserRole.DOCTOR,
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.CLINIC_MANAGER,
  ),
  updatePreferencesDto,
  validate,
  notificationController.updatePreferences,
);

router.patch(
  '/:id/read',
  authenticate,
  authorize(
    UserRole.PATIENT,
    UserRole.DOCTOR,
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.CLINIC_MANAGER,
  ),
  notificationIdParam,
  validate,
  notificationController.markAsRead,
);

router.use(authenticate, authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN));

router.get('/', adminListNotificationsQueryDto, validate, notificationController.getAllNotifications);

module.exports = router;

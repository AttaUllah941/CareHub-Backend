const { Router } = require('express');
const asyncHandler = require('../../core/utils/asyncHandler');
const { authenticate } = require('../../core/middleware/auth.middleware');
const { validate } = require('../../shared/middleware/validate.middleware');
const notificationsController = require('./notifications.controller');
const {
  listMyNotificationsSchema,
  notificationIdParamSchema,
} = require('./notifications.validator');

const router = Router();

router.get(
  '/me',
  authenticate,
  validate(listMyNotificationsSchema, 'query'),
  asyncHandler(notificationsController.listMyNotifications),
);

router.patch(
  '/:id/read',
  authenticate,
  validate(notificationIdParamSchema, 'params'),
  asyncHandler(notificationsController.markNotificationRead),
);

module.exports = router;

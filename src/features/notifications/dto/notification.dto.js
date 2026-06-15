const { body, param, query } = require('express-validator');
const { MAX_LIMIT } = require('../../../shared/constants/pagination.constants');
const { NOTIFICATION_TYPE_VALUES } = require('../../../shared/enums/notificationType.enum');

const notificationIdParam = [param('id').isMongoId().withMessage('Invalid notification ID')];

const listNotificationsQueryDto = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: MAX_LIMIT }),
  query('unreadOnly').optional().isIn(['true', 'false']),
];

const adminListNotificationsQueryDto = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: MAX_LIMIT }),
  query('userId').optional().isMongoId(),
  query('type').optional().isIn(NOTIFICATION_TYPE_VALUES),
  query('search').optional().trim().isLength({ max: 100 }),
];

const updatePreferencesDto = [
  body('emailEnabled').optional().isBoolean(),
  body('smsEnabled').optional().isBoolean(),
  body('pushEnabled').optional().isBoolean(),
  body('inAppEnabled').optional().isBoolean(),
  body('appointmentReminders').optional().isBoolean(),
  body('prescriptionAlerts').optional().isBoolean(),
  body('reminderLeadMinutes').optional().isArray(),
  body('reminderLeadMinutes.*').optional().isInt({ min: 5, max: 10080 }),
];

module.exports = {
  notificationIdParam,
  listNotificationsQueryDto,
  adminListNotificationsQueryDto,
  updatePreferencesDto,
};

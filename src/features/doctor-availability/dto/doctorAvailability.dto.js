const { body, param, query } = require('express-validator');
const { TIME_REGEX } = require('../utils/availabilityConflict.util');

const doctorProfileIdParam = [param('doctorProfileId').isMongoId().withMessage('Invalid doctor profile ID')];

const breakDto = [
  body('weeklySchedule.*.breaks.*.startTime').optional().matches(TIME_REGEX),
  body('weeklySchedule.*.breaks.*.endTime').optional().matches(TIME_REGEX),
];

const updateAvailabilityDto = [
  body('slotDurationMinutes').optional().isInt({ min: 5, max: 240 }),
  body('timezone').optional().trim().isLength({ max: 50 }),
  body('isActive').optional().isBoolean(),
  body('weeklySchedule').optional().isArray({ min: 1 }),
  body('weeklySchedule.*.dayOfWeek').optional().isInt({ min: 0, max: 6 }),
  body('weeklySchedule.*.isAvailable').optional().isBoolean(),
  body('weeklySchedule.*.startTime').optional().matches(TIME_REGEX),
  body('weeklySchedule.*.endTime').optional().matches(TIME_REGEX),
  body('weeklySchedule.*.breaks').optional().isArray(),
  ...breakDto,
  body('vacationDates').optional().isArray(),
  body('vacationDates.*.startDate').optional().isISO8601(),
  body('vacationDates.*.endDate').optional().isISO8601(),
  body('vacationDates.*.reason').optional().trim().isLength({ max: 255 }),
];

const slotsQueryDto = [
  query('date').isISO8601().withMessage('Valid date is required (YYYY-MM-DD)'),
];

module.exports = {
  doctorProfileIdParam,
  updateAvailabilityDto,
  slotsQueryDto,
};

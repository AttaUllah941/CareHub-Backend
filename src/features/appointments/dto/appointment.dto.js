const { body, param, query } = require('express-validator');
const { MAX_LIMIT } = require('../../../shared/constants/pagination.constants');
const { APPOINTMENT_STATUSES } = require('../../../shared/enums/appointmentStatus.enum');

const appointmentIdParam = [param('id').isMongoId().withMessage('Invalid appointment ID')];

const availableSlotsQueryDto = [
  query('doctorProfileId').isMongoId(),
  query('date').isISO8601(),
  query('clinicId').optional().isMongoId(),
];

const recurringSlotsQueryDto = [
  query('doctorProfileId').isMongoId(),
  query('fromDate').isISO8601(),
  query('toDate').isISO8601(),
  query('clinicId').optional().isMongoId(),
  query('maxDays').optional().isInt({ min: 1, max: 90 }),
];

const listAppointmentsQueryDto = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: MAX_LIMIT }),
  query('patientProfileId').optional().isMongoId(),
  query('doctorProfileId').optional().isMongoId(),
  query('clinicId').optional().isMongoId(),
  query('status').optional().isIn(APPOINTMENT_STATUSES),
  query('fromDate').optional().isISO8601(),
  query('toDate').optional().isISO8601(),
  query('search').optional().trim().isLength({ max: 100 }),
  query('sortBy').optional().isIn(['appointmentDate', 'createdAt', 'status']),
  query('sortOrder').optional().isIn(['asc', 'desc']),
];

const myAppointmentsQueryDto = [query('status').optional().isIn(APPOINTMENT_STATUSES)];

const bookAppointmentDto = [
  body('doctorProfileId').isMongoId(),
  body('clinicId').isMongoId(),
  body('appointmentDate').isISO8601(),
  body('startTime').matches(/^([01]\d|2[0-3]):([0-5]\d)$/),
  body('familyMemberId').optional({ values: 'falsy' }).isMongoId(),
  body('reason').optional().trim().isLength({ max: 500 }),
];

const updateAppointmentDto = [
  body('reason').optional().trim().isLength({ max: 500 }),
  body('notes').optional().trim().isLength({ max: 2000 }),
];

const cancelAppointmentDto = [
  body('cancellationReason').optional().trim().isLength({ max: 500 }),
];

const rescheduleAppointmentDto = [
  body('appointmentDate').isISO8601(),
  body('startTime').matches(/^([01]\d|2[0-3]):([0-5]\d)$/),
];

const updateStatusDto = [
  body('status').isIn(APPOINTMENT_STATUSES),
  body('notes').optional().trim().isLength({ max: 2000 }),
  body('cancellationReason').optional().trim().isLength({ max: 500 }),
];

module.exports = {
  appointmentIdParam,
  availableSlotsQueryDto,
  recurringSlotsQueryDto,
  listAppointmentsQueryDto,
  myAppointmentsQueryDto,
  bookAppointmentDto,
  updateAppointmentDto,
  cancelAppointmentDto,
  rescheduleAppointmentDto,
  updateStatusDto,
};

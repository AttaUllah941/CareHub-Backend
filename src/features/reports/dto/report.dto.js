const { query } = require('express-validator');
const { DOCTOR_VERIFICATION_STATUSES } = require('../../../shared/enums/doctorVerificationStatus.enum');
const { APPOINTMENT_STATUSES } = require('../../../shared/enums/appointmentStatus.enum');

const reportQueryDto = [
  query('fromDate').optional().isISO8601().withMessage('fromDate must be a valid date'),
  query('toDate').optional().isISO8601().withMessage('toDate must be a valid date'),
];

const doctorReportQueryDto = [
  ...reportQueryDto,
  query('verificationStatus').optional().isIn(DOCTOR_VERIFICATION_STATUSES),
];

const appointmentReportQueryDto = [
  ...reportQueryDto,
  query('status').optional().isIn(APPOINTMENT_STATUSES),
];

module.exports = {
  reportQueryDto,
  doctorReportQueryDto,
  appointmentReportQueryDto,
};

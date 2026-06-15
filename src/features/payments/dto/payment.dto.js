const { body, param, query } = require('express-validator');
const { MAX_LIMIT } = require('../../../shared/constants/pagination.constants');
const { PAYMENT_GATEWAY_VALUES } = require('../../../shared/enums/paymentGateway.enum');
const { PAYMENT_STATUS_VALUES } = require('../../../shared/enums/paymentStatus.enum');

const paymentIdParam = [param('id').isMongoId().withMessage('Invalid payment ID')];
const appointmentIdParam = [param('appointmentId').isMongoId().withMessage('Invalid appointment ID')];

const initiatePaymentDto = [
  ...appointmentIdParam,
  body('gateway').isIn(PAYMENT_GATEWAY_VALUES).withMessage('Gateway must be JAZZCASH or EASYPAISA'),
];

const refundPaymentDto = [
  body('amount').optional().isFloat({ min: 0.01 }),
  body('reason').trim().notEmpty().isLength({ max: 500 }),
];

const listPaymentsQueryDto = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: MAX_LIMIT }),
];

const adminListPaymentsQueryDto = [
  ...listPaymentsQueryDto,
  query('status').optional().isIn(PAYMENT_STATUS_VALUES),
  query('gateway').optional().isIn(PAYMENT_GATEWAY_VALUES),
  query('patientProfileId').optional().isMongoId(),
  query('search').optional().trim().isLength({ max: 100 }),
];

module.exports = {
  paymentIdParam,
  appointmentIdParam,
  initiatePaymentDto,
  refundPaymentDto,
  listPaymentsQueryDto,
  adminListPaymentsQueryDto,
};

const { Router } = require('express');
const container = require('../../../core/container');
const validate = require('../../../core/middleware/validate.middleware');
const { authenticate, authorize } = require('../../../core/middleware/auth.middleware');
const { UserRole } = require('../../../shared/enums/userRole.enum');
const {
  paymentIdParam,
  appointmentIdParam,
  initiatePaymentDto,
  refundPaymentDto,
  listPaymentsQueryDto,
  adminListPaymentsQueryDto,
} = require('../dto/payment.dto');

const router = Router();
const paymentController = container.resolve('paymentController');

router.post('/callback/jazzcash', paymentController.jazzCashCallback);
router.post('/callback/easypaisa', paymentController.easyPaisaCallback);
router.get('/callback/jazzcash', paymentController.jazzCashCallback);
router.get('/callback/easypaisa', paymentController.easyPaisaCallback);

router.get(
  '/me',
  authenticate,
  authorize(UserRole.PATIENT, UserRole.SUPER_ADMIN, UserRole.ADMIN),
  listPaymentsQueryDto,
  validate,
  paymentController.getMyPayments,
);

router.post(
  '/appointment/:appointmentId/initiate',
  authenticate,
  authorize(UserRole.PATIENT),
  initiatePaymentDto,
  validate,
  paymentController.initiatePayment,
);

router.get(
  '/appointment/:appointmentId',
  authenticate,
  authorize(UserRole.PATIENT, UserRole.DOCTOR, UserRole.SUPER_ADMIN, UserRole.ADMIN),
  appointmentIdParam,
  validate,
  paymentController.getByAppointmentId,
);

router.get(
  '/:id/verify',
  authenticate,
  authorize(UserRole.PATIENT, UserRole.SUPER_ADMIN, UserRole.ADMIN),
  paymentIdParam,
  validate,
  paymentController.verifyPayment,
);

router.get(
  '/:id',
  authenticate,
  authorize(UserRole.PATIENT, UserRole.DOCTOR, UserRole.SUPER_ADMIN, UserRole.ADMIN),
  paymentIdParam,
  validate,
  paymentController.getPaymentById,
);

router.post(
  '/:id/refund',
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  paymentIdParam,
  refundPaymentDto,
  validate,
  paymentController.initiateRefund,
);

router.use(authenticate, authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN));

router.get('/', adminListPaymentsQueryDto, validate, paymentController.getAllPayments);

module.exports = router;

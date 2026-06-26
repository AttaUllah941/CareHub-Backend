const { Router } = require('express');
const asyncHandler = require('../../core/utils/asyncHandler');
const { authenticate, authorize } = require('../../core/middleware/auth.middleware');
const { validate } = require('../../shared/middleware/validate.middleware');
const { UserRole } = require('../../shared/enums/userRole.enum');
const appointmentsController = require('./appointments.controller');
const { appointmentIdParamsSchema } = require('./appointments.validator');

const router = Router();

router.patch(
  '/doctor/appointments/:id/confirm',
  authenticate,
  authorize(UserRole.DOCTOR),
  validate(appointmentIdParamsSchema, 'params'),
  asyncHandler(appointmentsController.confirm),
);

router.patch(
  '/appointments/:id/cancel',
  authenticate,
  authorize(UserRole.PATIENT),
  validate(appointmentIdParamsSchema, 'params'),
  asyncHandler(appointmentsController.cancel),
);

module.exports = router;

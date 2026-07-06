const { Router } = require('express');
const asyncHandler = require('../../core/utils/asyncHandler');
const { authenticate, authorize, optionalAuthenticate } = require('../../core/middleware/auth.middleware');
const { validate } = require('../../shared/middleware/validate.middleware');
const { UserRole } = require('../../shared/enums/userRole.enum');
const appointmentsController = require('./appointments.controller');
const {
  appointmentIdParamsSchema,
  createAppointmentSchema,
  listAppointmentsQuerySchema,
} = require('./appointments.validator');

const router = Router();

router.post(
  '/appointments',
  optionalAuthenticate,
  validate(createAppointmentSchema),
  asyncHandler(appointmentsController.create),
);

router.get(
  '/appointments/me',
  authenticate,
  authorize(UserRole.PATIENT),
  validate(listAppointmentsQuerySchema, 'query'),
  asyncHandler(appointmentsController.listMine),
);

router.patch(
  '/appointments/:id/cancel',
  authenticate,
  authorize(UserRole.PATIENT),
  validate(appointmentIdParamsSchema, 'params'),
  asyncHandler(appointmentsController.cancel),
);

module.exports = router;

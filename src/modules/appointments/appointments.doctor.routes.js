const express = require('express');
const appointmentsController = require('./appointments.controller');
const { rejectAppointmentSchema } = require('./appointments.validator');
const { validateBody } = require('../../shared/middleware/validate.middleware');
const { authenticate, authorize } = require('../../core/middleware/auth.middleware');
const { UserRole } = require('../../shared/enums/userRole.enum');
const { loadDoctorProfile } = require('../../shared/middleware/resourceOwner.middleware');

const router = express.Router();

router.get(
  '/',
  authenticate,
  authorize(UserRole.DOCTOR),
  loadDoctorProfile,
  appointmentsController.listDoctorAppointments,
);

router.patch(
  '/:id/confirm',
  authenticate,
  authorize(UserRole.DOCTOR),
  loadDoctorProfile,
  appointmentsController.confirm,
);

router.patch(
  '/:id/complete',
  authenticate,
  authorize(UserRole.DOCTOR),
  loadDoctorProfile,
  appointmentsController.complete,
);

router.patch(
  '/:id/reject',
  authenticate,
  authorize(UserRole.DOCTOR),
  loadDoctorProfile,
  validateBody(rejectAppointmentSchema),
  appointmentsController.reject,
);

module.exports = router;

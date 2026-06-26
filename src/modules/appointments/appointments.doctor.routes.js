const express = require('express');
const appointmentsController = require('./appointments.controller');
const { rejectAppointmentSchema } = require('./appointments.validator');
const { validateBody } = require('../../shared/middleware/validate.middleware');
const { authenticate } = require('../../shared/middleware/auth.middleware');
const { authorize } = require('../../shared/middleware/role.middleware');
const { loadDoctorProfile } = require('../../shared/middleware/resourceOwner.middleware');

const router = express.Router();

router.get(
  '/',
  authenticate,
  authorize('DOCTOR'),
  loadDoctorProfile,
  appointmentsController.listDoctorAppointments,
);

router.patch(
  '/:id/confirm',
  authenticate,
  authorize('DOCTOR'),
  loadDoctorProfile,
  appointmentsController.confirm,
);

router.patch(
  '/:id/complete',
  authenticate,
  authorize('DOCTOR'),
  loadDoctorProfile,
  appointmentsController.complete,
);

router.patch(
  '/:id/reject',
  authenticate,
  authorize('DOCTOR'),
  loadDoctorProfile,
  validateBody(rejectAppointmentSchema),
  appointmentsController.reject,
);

module.exports = router;

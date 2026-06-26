const express = require('express');
const appointmentsController = require('./appointments.controller');
const { createAppointmentSchema } = require('./appointments.validator');
const { validateBody } = require('../../shared/middleware/validate.middleware');
const { authenticate, optionalAuthenticate } = require('../../shared/middleware/auth.middleware');
const { authorize } = require('../../shared/middleware/role.middleware');

const router = express.Router();

router.post(
  '/',
  optionalAuthenticate,
  validateBody(createAppointmentSchema),
  appointmentsController.create,
);

router.get(
  '/me',
  authenticate,
  authorize('PATIENT'),
  appointmentsController.listMine,
);

router.get('/:id', authenticate, appointmentsController.getById);

router.patch('/:id/cancel', authenticate, appointmentsController.cancel);

module.exports = router;

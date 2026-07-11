const express = require('express');
const schedulesController = require('./schedules.controller');
const { createScheduleSchema } = require('./schedules.validator');
const { validateBody } = require('../../shared/middleware/validate.middleware');
const { authenticate, authorize } = require('../../core/middleware/auth.middleware');
const { UserRole } = require('../../shared/enums/userRole.enum');
const { loadDoctorProfile } = require('../../shared/middleware/resourceOwner.middleware');

const router = express.Router();

router.post(
  '/',
  authenticate,
  authorize(UserRole.DOCTOR),
  loadDoctorProfile,
  validateBody(createScheduleSchema),
  schedulesController.create,
);

router.get(
  '/me',
  authenticate,
  authorize(UserRole.DOCTOR),
  loadDoctorProfile,
  schedulesController.listMine,
);

router.delete(
  '/:id',
  authenticate,
  authorize(UserRole.DOCTOR),
  loadDoctorProfile,
  schedulesController.deactivate,
);

module.exports = router;

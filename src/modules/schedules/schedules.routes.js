const express = require('express');
const schedulesController = require('./schedules.controller');
const { createScheduleSchema } = require('./schedules.validator');
const { validateBody } = require('../../shared/middleware/validate.middleware');
const { authenticate } = require('../../shared/middleware/auth.middleware');
const { authorize } = require('../../shared/middleware/role.middleware');
const { loadDoctorProfile } = require('../../shared/middleware/resourceOwner.middleware');

const router = express.Router();

router.post(
  '/',
  authenticate,
  authorize('DOCTOR'),
  loadDoctorProfile,
  validateBody(createScheduleSchema),
  schedulesController.create,
);

router.get(
  '/me',
  authenticate,
  authorize('DOCTOR'),
  loadDoctorProfile,
  schedulesController.listMine,
);

router.delete(
  '/:id',
  authenticate,
  authorize('DOCTOR'),
  loadDoctorProfile,
  schedulesController.deactivate,
);

module.exports = router;

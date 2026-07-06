const express = require('express');
const prescriptionsController = require('./prescriptions.controller');
const {
  createPrescriptionSchema,
  listPrescriptionsQuerySchema,
} = require('./prescriptions.validator');
const { validate } = require('../../shared/middleware/validate.middleware');
const { authenticate, authorize } = require('../../core/middleware/auth.middleware');
const { UserRole } = require('../../shared/enums/userRole.enum');
const { loadDoctorProfile } = require('../../shared/middleware/resourceOwner.middleware');

const router = express.Router();

router.get(
  '/',
  authenticate,
  authorize(UserRole.DOCTOR),
  loadDoctorProfile,
  validate(listPrescriptionsQuerySchema, 'query'),
  prescriptionsController.listMine,
);

router.post(
  '/',
  authenticate,
  authorize(UserRole.DOCTOR),
  loadDoctorProfile,
  validate(createPrescriptionSchema),
  prescriptionsController.create,
);

module.exports = router;

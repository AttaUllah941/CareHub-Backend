const express = require('express');
const clinicsController = require('./clinics.controller');
const clinicsRepository = require('./clinics.repository');
const { createClinicSchema, updateClinicSchema } = require('./clinics.validator');
const { validateBody } = require('../../shared/middleware/validate.middleware');
const { authenticate, authorize } = require('../../core/middleware/auth.middleware');
const { UserRole } = require('../../shared/enums/userRole.enum');
const {
  loadDoctorProfile,
  requireResourceOwner,
} = require('../../shared/middleware/resourceOwner.middleware');

const router = express.Router();

const loadClinicForOwner = requireResourceOwner(
  async (req) => clinicsRepository.findById(req.params.id),
  'Clinic not found',
);

router.post(
  '/',
  authenticate,
  authorize(UserRole.DOCTOR),
  loadDoctorProfile,
  validateBody(createClinicSchema),
  clinicsController.create,
);

router.get(
  '/me',
  authenticate,
  authorize(UserRole.DOCTOR),
  loadDoctorProfile,
  clinicsController.listMine,
);

router.put(
  '/:id',
  authenticate,
  authorize(UserRole.DOCTOR),
  loadClinicForOwner,
  validateBody(updateClinicSchema),
  clinicsController.update,
);

router.delete(
  '/:id',
  authenticate,
  authorize(UserRole.DOCTOR),
  loadClinicForOwner,
  clinicsController.remove,
);

module.exports = router;

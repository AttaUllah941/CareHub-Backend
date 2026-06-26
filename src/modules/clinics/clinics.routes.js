const express = require('express');
const clinicsController = require('./clinics.controller');
const clinicsRepository = require('./clinics.repository');
const { createClinicSchema, updateClinicSchema } = require('./clinics.validator');
const { validateBody } = require('../../shared/middleware/validate.middleware');
const { authenticate } = require('../../shared/middleware/auth.middleware');
const { authorize } = require('../../shared/middleware/role.middleware');
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
  authorize('DOCTOR'),
  loadDoctorProfile,
  validateBody(createClinicSchema),
  clinicsController.create,
);

router.put(
  '/:id',
  authenticate,
  authorize('DOCTOR'),
  loadClinicForOwner,
  validateBody(updateClinicSchema),
  clinicsController.update,
);

router.delete(
  '/:id',
  authenticate,
  authorize('DOCTOR'),
  loadClinicForOwner,
  clinicsController.remove,
);

module.exports = router;

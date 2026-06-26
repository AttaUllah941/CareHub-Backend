const express = require('express');
const doctorsController = require('./doctors.controller');
const clinicsController = require('../clinics/clinics.controller');
const schedulesController = require('../schedules/schedules.controller');
const { updateMyProfileSchema } = require('./doctors.validator');
const { validateBody } = require('../../shared/middleware/validate.middleware');
const { authenticate } = require('../../shared/middleware/auth.middleware');
const { authorize } = require('../../shared/middleware/role.middleware');

const router = express.Router();

router.get('/public/search', doctorsController.searchPublic);
router.get('/public/:id', doctorsController.getPublicById);

router.get('/:doctorId/clinics', clinicsController.listByDoctor);
router.get('/:doctorId/availability', schedulesController.getAvailability);

router.get('/me', authenticate, authorize('DOCTOR'), doctorsController.getMyProfile);
router.put(
  '/me',
  authenticate,
  authorize('DOCTOR'),
  validateBody(updateMyProfileSchema),
  doctorsController.updateMyProfile,
);

module.exports = router;

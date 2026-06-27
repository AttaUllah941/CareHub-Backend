const { Router } = require('express');
const doctorsController = require('./doctors.controller');
const { updateMyProfileSchema } = require('./doctors.validator');
const { validateBody } = require('../../shared/middleware/validate.middleware');
const { authenticate, authorize } = require('../../core/middleware/auth.middleware');

const router = Router();

router.get('/me', authenticate, authorize('DOCTOR'), doctorsController.getMyProfile);

router.patch(
  '/me',
  authenticate,
  authorize('DOCTOR'),
  validateBody(updateMyProfileSchema),
  doctorsController.updateMyProfile,
);

module.exports = router;

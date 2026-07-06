const { Router } = require('express');
const doctorsController = require('./doctors.controller');
const { updateMyProfileSchema } = require('./doctors.validator');
const { validate } = require('../../shared/middleware/validate.middleware');
const { authenticate, authorize } = require('../../core/middleware/auth.middleware');
const { UserRole } = require('../../shared/enums/userRole.enum');

const router = Router();

router.get(
  '/me',
  authenticate,
  authorize(UserRole.DOCTOR),
  doctorsController.getMyProfile,
);

router.patch(
  '/me',
  authenticate,
  authorize(UserRole.DOCTOR),
  validate(updateMyProfileSchema, 'body'),
  doctorsController.updateMyProfile,
);

module.exports = router;

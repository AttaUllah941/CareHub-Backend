const { Router } = require('express');
const container = require('../../../core/container');
const validate = require('../../../core/middleware/validate.middleware');
const { authenticate, authorize } = require('../../../core/middleware/auth.middleware');
const { UserRole } = require('../../../shared/enums/userRole.enum');
const {
  doctorProfileIdParam,
  updateAvailabilityDto,
  slotsQueryDto,
} = require('../dto/doctorAvailability.dto');

const router = Router();
const availabilityController = container.resolve('doctorAvailabilityController');

router.get(
  '/me',
  authenticate,
  authorize(UserRole.DOCTOR),
  availabilityController.getMyAvailability,
);

router.put(
  '/me',
  authenticate,
  authorize(UserRole.DOCTOR),
  updateAvailabilityDto,
  validate,
  availabilityController.updateMyAvailability,
);

router.get(
  '/me/slots',
  authenticate,
  authorize(UserRole.DOCTOR),
  slotsQueryDto,
  validate,
  availabilityController.getMySlots,
);

router.get(
  '/:doctorProfileId/slots',
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.DOCTOR),
  doctorProfileIdParam,
  slotsQueryDto,
  validate,
  availabilityController.getSlots,
);

router.get(
  '/:doctorProfileId',
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.DOCTOR),
  doctorProfileIdParam,
  validate,
  availabilityController.getAvailability,
);

router.put(
  '/:doctorProfileId',
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  doctorProfileIdParam,
  updateAvailabilityDto,
  validate,
  availabilityController.updateAvailability,
);

module.exports = router;

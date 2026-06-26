const { Router } = require('express');
const labBookingsController = require('./lab-bookings.controller');
const { createBookingSchema, cancelBookingParamsSchema } = require('./labs.validator');
const { validate } = require('../../shared/middleware/validate.middleware');
const {
  authenticate,
  optionalAuthenticate,
  authorize,
} = require('../../core/middleware/auth.middleware');
const { UserRole } = require('../../shared/enums/userRole.enum');

const router = Router();

router.post('/', optionalAuthenticate, validate(createBookingSchema), labBookingsController.create);

router.get(
  '/me',
  authenticate,
  authorize(UserRole.PATIENT),
  labBookingsController.listMine,
);

router.patch(
  '/:id/cancel',
  authenticate,
  authorize(UserRole.PATIENT),
  validate(cancelBookingParamsSchema, 'params'),
  labBookingsController.cancel,
);

module.exports = router;

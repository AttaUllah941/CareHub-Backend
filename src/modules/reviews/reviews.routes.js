const { Router } = require('express');
const reviewsController = require('./reviews.controller');
const { reviewBodySchema, reviewIdParamsSchema } = require('./reviews.validator');
const { validate, validateRequest } = require('../../shared/middleware/validate.middleware');
const { authenticate, authorize } = require('../../core/middleware/auth.middleware');
const { UserRole } = require('../../shared/enums/userRole.enum');

const router = Router();

router.put(
  '/:id',
  authenticate,
  authorize(UserRole.PATIENT),
  validateRequest({ params: reviewIdParamsSchema, body: reviewBodySchema }),
  reviewsController.update,
);

router.delete(
  '/:id',
  authenticate,
  authorize(UserRole.PATIENT, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  validate(reviewIdParamsSchema, 'params'),
  reviewsController.remove,
);

module.exports = router;

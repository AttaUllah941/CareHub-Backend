const { Router } = require('express');
const reviewsController = require('./reviews.controller');
const { reviewBodySchema, createReviewParamsSchema } = require('./reviews.validator');
const { validateRequest } = require('../../shared/middleware/validate.middleware');
const { authenticate, authorize } = require('../../core/middleware/auth.middleware');
const { UserRole } = require('../../shared/enums/userRole.enum');

const router = Router();

router.get('/:doctorId/reviews', reviewsController.listByDoctor);

router.post(
  '/:doctorId/reviews',
  authenticate,
  authorize(UserRole.PATIENT),
  validateRequest({ params: createReviewParamsSchema, body: reviewBodySchema }),
  reviewsController.create,
);

module.exports = router;

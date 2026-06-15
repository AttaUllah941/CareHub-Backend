const { Router } = require('express');
const container = require('../../../core/container');
const validate = require('../../../core/middleware/validate.middleware');
const { authenticate, authorize } = require('../../../core/middleware/auth.middleware');
const { UserRole } = require('../../../shared/enums/userRole.enum');
const {
  reviewIdParam,
  appointmentIdParam,
  doctorProfileIdParam,
  createReviewDto,
  updateReviewDto,
  moderateReviewDto,
  listReviewsQueryDto,
} = require('../dto/review.dto');

const router = Router();
const reviewController = container.resolve('reviewController');

router.get(
  '/me',
  authenticate,
  authorize(UserRole.PATIENT),
  reviewController.getMyReviews,
);

router.get(
  '/doctor',
  authenticate,
  authorize(UserRole.DOCTOR),
  reviewController.getDoctorReviews,
);

router.get(
  '/doctor/:doctorProfileId/stats',
  authenticate,
  authorize(UserRole.PATIENT, UserRole.DOCTOR, UserRole.SUPER_ADMIN, UserRole.ADMIN),
  doctorProfileIdParam,
  validate,
  reviewController.getDoctorStats,
);

router.get(
  '/doctor/:doctorProfileId',
  authenticate,
  authorize(UserRole.PATIENT, UserRole.DOCTOR, UserRole.SUPER_ADMIN, UserRole.ADMIN),
  doctorProfileIdParam,
  validate,
  reviewController.getByDoctorProfileId,
);

router.get(
  '/appointment/:appointmentId',
  authenticate,
  authorize(UserRole.PATIENT, UserRole.DOCTOR, UserRole.SUPER_ADMIN, UserRole.ADMIN),
  appointmentIdParam,
  validate,
  reviewController.getByAppointmentId,
);

router.post(
  '/appointment/:appointmentId',
  authenticate,
  authorize(UserRole.PATIENT),
  createReviewDto,
  validate,
  reviewController.createForAppointment,
);

router.get(
  '/:id',
  authenticate,
  authorize(UserRole.PATIENT, UserRole.DOCTOR, UserRole.SUPER_ADMIN, UserRole.ADMIN),
  reviewIdParam,
  validate,
  reviewController.getReviewById,
);

router.put(
  '/:id',
  authenticate,
  authorize(UserRole.PATIENT, UserRole.SUPER_ADMIN, UserRole.ADMIN),
  reviewIdParam,
  updateReviewDto,
  validate,
  reviewController.updateReview,
);

router.patch(
  '/:id/moderate',
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  reviewIdParam,
  moderateReviewDto,
  validate,
  reviewController.moderateReview,
);

router.use(authenticate, authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN));

router.get('/', listReviewsQueryDto, validate, reviewController.getReviews);
router.delete('/:id', reviewIdParam, validate, reviewController.deleteReview);

module.exports = router;

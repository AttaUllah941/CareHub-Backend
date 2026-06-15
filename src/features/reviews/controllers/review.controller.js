const asyncHandler = require('../../../core/utils/asyncHandler');
const { HttpStatus } = require('../../../shared/constants/httpStatus.constants');

class ReviewController {
  constructor(reviewService) {
    this.reviewService = reviewService;
  }

  getMyReviews = asyncHandler(async (req, res) => {
    const reviews = await this.reviewService.getMyReviews(req.user);
    res.status(HttpStatus.OK).json({ success: true, data: { reviews } });
  });

  getDoctorReviews = asyncHandler(async (req, res) => {
    const reviews = await this.reviewService.getDoctorReviews(req.user);
    res.status(HttpStatus.OK).json({ success: true, data: { reviews } });
  });

  getByDoctorProfileId = asyncHandler(async (req, res) => {
    const result = await this.reviewService.getReviewsByDoctorProfileId(
      req.params.doctorProfileId,
      req.user,
    );
    res.status(HttpStatus.OK).json({ success: true, data: result });
  });

  getDoctorStats = asyncHandler(async (req, res) => {
    const stats = await this.reviewService.getDoctorStats(req.params.doctorProfileId);
    res.status(HttpStatus.OK).json({ success: true, data: { stats } });
  });

  getByAppointmentId = asyncHandler(async (req, res) => {
    const review = await this.reviewService.getReviewByAppointmentId(
      req.params.appointmentId,
      req.user,
    );
    res.status(HttpStatus.OK).json({ success: true, data: { review } });
  });

  createForAppointment = asyncHandler(async (req, res) => {
    const review = await this.reviewService.createReview(
      req.params.appointmentId,
      req.body,
      req.user,
    );
    res.status(HttpStatus.CREATED).json({
      success: true,
      message: 'Review submitted successfully',
      data: { review },
    });
  });

  getReviewById = asyncHandler(async (req, res) => {
    const review = await this.reviewService.getReviewById(req.params.id, req.user);
    res.status(HttpStatus.OK).json({ success: true, data: { review } });
  });

  getReviews = asyncHandler(async (req, res) => {
    const result = await this.reviewService.getReviews(req.query, req.user);
    res.status(HttpStatus.OK).json({ success: true, data: result });
  });

  updateReview = asyncHandler(async (req, res) => {
    const review = await this.reviewService.updateReview(req.params.id, req.body, req.user);
    res.status(HttpStatus.OK).json({
      success: true,
      message: 'Review updated',
      data: { review },
    });
  });

  moderateReview = asyncHandler(async (req, res) => {
    const review = await this.reviewService.moderateReview(req.params.id, req.body, req.user);
    res.status(HttpStatus.OK).json({
      success: true,
      message: 'Review moderated',
      data: { review },
    });
  });

  deleteReview = asyncHandler(async (req, res) => {
    const result = await this.reviewService.deleteReview(req.params.id, req.user);
    res.status(HttpStatus.OK).json({ success: true, message: result.message });
  });
}

module.exports = ReviewController;

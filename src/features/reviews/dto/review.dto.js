const { body, param, query } = require('express-validator');
const { MAX_LIMIT } = require('../../../shared/constants/pagination.constants');
const { REVIEW_STATUS_VALUES } = require('../../../shared/enums/reviewStatus.enum');

const reviewIdParam = [param('id').isMongoId().withMessage('Invalid review ID')];
const appointmentIdParam = [param('appointmentId').isMongoId().withMessage('Invalid appointment ID')];
const doctorProfileIdParam = [
  param('doctorProfileId').isMongoId().withMessage('Invalid doctor profile ID'),
];

const createReviewDto = [
  ...appointmentIdParam,
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('title').optional().trim().isLength({ max: 150 }),
  body('comment').optional().trim().isLength({ max: 2000 }),
];

const updateReviewDto = [
  body('rating').optional().isInt({ min: 1, max: 5 }),
  body('title').optional().trim().isLength({ max: 150 }),
  body('comment').optional().trim().isLength({ max: 2000 }),
  body('status').optional().isIn(REVIEW_STATUS_VALUES),
  body('moderationNote').optional().trim().isLength({ max: 500 }),
];

const moderateReviewDto = [
  body('status').isIn(REVIEW_STATUS_VALUES).withMessage('Invalid moderation status'),
  body('moderationNote').optional().trim().isLength({ max: 500 }),
];

const listReviewsQueryDto = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: MAX_LIMIT }),
  query('patientProfileId').optional().isMongoId(),
  query('doctorProfileId').optional().isMongoId(),
  query('clinicId').optional().isMongoId(),
  query('status').optional().isIn(REVIEW_STATUS_VALUES),
  query('rating').optional().isInt({ min: 1, max: 5 }),
  query('search').optional().trim().isLength({ max: 100 }),
  query('sortBy').optional().isIn(['createdAt', 'updatedAt', 'rating']),
  query('sortOrder').optional().isIn(['asc', 'desc']),
];

module.exports = {
  reviewIdParam,
  appointmentIdParam,
  doctorProfileIdParam,
  createReviewDto,
  updateReviewDto,
  moderateReviewDto,
  listReviewsQueryDto,
};

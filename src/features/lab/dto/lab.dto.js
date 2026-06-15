const { body, param, query } = require('express-validator');
const { LAB_BOOKING_STATUS_VALUES } = require('../../../shared/enums/labBookingStatus.enum');
const { LAB_COLLECTION_TYPE_VALUES } = require('../../../shared/enums/labCollectionType.enum');

const mongoId = (field) => param(field).isMongoId();

const listLabsQueryDto = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('search').optional().trim(),
  query('city').optional().trim(),
  query('homeCollectionAvailable').optional().isBoolean(),
];

const createLabDto = [
  body('name').trim().notEmpty().isLength({ max: 200 }),
  body('description').optional().trim().isLength({ max: 2000 }),
  body('address').optional().trim().isLength({ max: 500 }),
  body('city').optional().trim().isLength({ max: 100 }),
  body('state').optional().trim().isLength({ max: 100 }),
  body('phone').optional().trim().isLength({ max: 30 }),
  body('email').optional().trim().isEmail(),
  body('website').optional().trim().isLength({ max: 300 }),
  body('homeCollectionAvailable').optional().isBoolean(),
  body('homeCollectionFee').optional().isFloat({ min: 0 }),
  body('openingHours').optional().trim().isLength({ max: 500 }),
];

const updateLabDto = [
  body('name').optional().trim().notEmpty().isLength({ max: 200 }),
  body('description').optional().trim().isLength({ max: 2000 }),
  body('address').optional().trim().isLength({ max: 500 }),
  body('city').optional().trim().isLength({ max: 100 }),
  body('state').optional().trim().isLength({ max: 100 }),
  body('phone').optional().trim().isLength({ max: 30 }),
  body('email').optional().trim().isEmail(),
  body('website').optional().trim().isLength({ max: 300 }),
  body('homeCollectionAvailable').optional().isBoolean(),
  body('homeCollectionFee').optional().isFloat({ min: 0 }),
  body('openingHours').optional().trim().isLength({ max: 500 }),
  body('isActive').optional().isBoolean(),
];

const listTestsQueryDto = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('search').optional().trim(),
  query('labId').optional().isMongoId(),
  query('category').optional().isIn(['BLOOD', 'URINE', 'STOOL', 'IMAGING', 'HORMONE', 'COVID', 'OTHER']),
  query('homeCollectionAvailable').optional().isBoolean(),
];

const createTestDto = [
  body('labId').isMongoId(),
  body('name').trim().notEmpty().isLength({ max: 200 }),
  body('code').optional().trim().isLength({ max: 50 }),
  body('category').optional().isIn(['BLOOD', 'URINE', 'STOOL', 'IMAGING', 'HORMONE', 'COVID', 'OTHER']),
  body('description').optional().trim().isLength({ max: 2000 }),
  body('price').isFloat({ min: 0 }),
  body('currency').optional().trim().isLength({ max: 10 }),
  body('sampleType').optional().trim().isLength({ max: 100 }),
  body('preparationInstructions').optional().trim().isLength({ max: 1000 }),
  body('turnaroundHours').optional().isInt({ min: 1 }),
  body('homeCollectionAvailable').optional().isBoolean(),
];

const updateTestDto = [
  body('name').optional().trim().notEmpty().isLength({ max: 200 }),
  body('code').optional().trim().isLength({ max: 50 }),
  body('category').optional().isIn(['BLOOD', 'URINE', 'STOOL', 'IMAGING', 'HORMONE', 'COVID', 'OTHER']),
  body('description').optional().trim().isLength({ max: 2000 }),
  body('price').optional().isFloat({ min: 0 }),
  body('homeCollectionAvailable').optional().isBoolean(),
  body('isActive').optional().isBoolean(),
];

const createBookingDto = [
  body('items').isArray({ min: 1 }),
  body('items.*.labTestId').isMongoId(),
  body('collectionType').optional().isIn(LAB_COLLECTION_TYPE_VALUES),
  body('scheduledDate').optional().isISO8601(),
  body('scheduledTimeSlot').optional().trim().isLength({ max: 50 }),
  body('homeAddress').optional().trim().isLength({ max: 500 }),
  body('homeCity').optional().trim().isLength({ max: 100 }),
  body('homePhone').optional().trim().isLength({ max: 30 }),
  body('collectionNotes').optional().trim().isLength({ max: 1000 }),
  body('notes').optional().trim().isLength({ max: 1000 }),
];

const updateBookingStatusDto = [
  body('status').isIn(LAB_BOOKING_STATUS_VALUES),
  body('notes').optional().trim().isLength({ max: 1000 }),
];

const cancelBookingDto = [body('cancellationReason').optional().trim().isLength({ max: 500 })];

const uploadReportDto = [
  body('patientProfileId').isMongoId(),
  body('labId').isMongoId(),
  body('labBookingId').optional().isMongoId(),
  body('title').optional().trim().isLength({ max: 200 }),
  body('notes').optional().trim().isLength({ max: 1000 }),
];

module.exports = {
  mongoId,
  listLabsQueryDto,
  createLabDto,
  updateLabDto,
  listTestsQueryDto,
  createTestDto,
  updateTestDto,
  createBookingDto,
  updateBookingStatusDto,
  cancelBookingDto,
  uploadReportDto,
};

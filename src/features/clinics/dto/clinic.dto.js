const { body, param, query } = require('express-validator');
const { MAX_LIMIT } = require('../../../shared/constants/pagination.constants');

const clinicSlugRegex = /^[a-z][a-z0-9-]*$/;

const clinicIdParam = [param('id').isMongoId().withMessage('Invalid clinic ID')];

const workingHoursDto = body('workingHours')
  .optional()
  .isArray()
  .withMessage('workingHours must be an array');

const workingHoursItemDto = [
  body('workingHours.*.dayOfWeek').isInt({ min: 0, max: 6 }),
  body('workingHours.*.isOpen').isBoolean(),
  body('workingHours.*.openTime').matches(/^([01]\d|2[0-3]):([0-5]\d)$/),
  body('workingHours.*.closeTime').matches(/^([01]\d|2[0-3]):([0-5]\d)$/),
  body('workingHours.*.breaks').optional().isArray(),
  body('workingHours.*.breaks.*.startTime').optional().matches(/^([01]\d|2[0-3]):([0-5]\d)$/),
  body('workingHours.*.breaks.*.endTime').optional().matches(/^([01]\d|2[0-3]):([0-5]\d)$/),
];

const locationDto = [
  body('location.latitude').optional().isFloat({ min: -90, max: 90 }),
  body('location.longitude').optional().isFloat({ min: -180, max: 180 }),
];

const listClinicsQueryDto = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: MAX_LIMIT }),
  query('search').optional().trim().isLength({ max: 100 }),
  query('city').optional().trim().isLength({ max: 100 }),
  query('country').optional().trim().isLength({ max: 100 }),
  query('isActive').optional().isIn(['true', 'false']),
  query('sortBy').optional().isIn(['name', 'slug', 'city', 'country', 'createdAt', 'isActive']),
  query('sortOrder').optional().isIn(['asc', 'desc']),
];

const createClinicDto = [
  body('name').trim().notEmpty().isLength({ max: 150 }),
  body('slug')
    .trim()
    .notEmpty()
    .matches(clinicSlugRegex)
    .withMessage('Slug must be lowercase alphanumeric with hyphens'),
  body('description').optional().trim().isLength({ max: 2000 }),
  body('phone').optional().trim().isLength({ max: 30 }),
  body('email').optional().trim().isEmail().isLength({ max: 150 }),
  body('address').optional().trim().isLength({ max: 300 }),
  body('city').optional().trim().isLength({ max: 100 }),
  body('state').optional().trim().isLength({ max: 100 }),
  body('country').optional().trim().isLength({ max: 100 }),
  body('postalCode').optional().trim().isLength({ max: 20 }),
  body('managerId').optional().isMongoId(),
  body('doctorProfileIds').optional().isArray(),
  body('doctorProfileIds.*').optional().isMongoId(),
  workingHoursDto,
  ...workingHoursItemDto,
  body('location').optional().isObject(),
  ...locationDto,
];

const updateClinicDto = [
  ...clinicIdParam,
  body('name').optional().trim().notEmpty().isLength({ max: 150 }),
  body('slug').optional().trim().matches(clinicSlugRegex),
  body('description').optional().trim().isLength({ max: 2000 }),
  body('phone').optional().trim().isLength({ max: 30 }),
  body('email').optional().trim().isEmail().isLength({ max: 150 }),
  body('address').optional().trim().isLength({ max: 300 }),
  body('city').optional().trim().isLength({ max: 100 }),
  body('state').optional().trim().isLength({ max: 100 }),
  body('country').optional().trim().isLength({ max: 100 }),
  body('postalCode').optional().trim().isLength({ max: 20 }),
  body('managerId').optional().isMongoId(),
  body('doctorProfileIds').optional().isArray(),
  body('doctorProfileIds.*').optional().isMongoId(),
  body('isActive').optional().isBoolean(),
  workingHoursDto,
  ...workingHoursItemDto,
  body('location').optional().isObject(),
  ...locationDto,
];

const updateMyClinicDto = [
  body('name').optional().trim().notEmpty().isLength({ max: 150 }),
  body('description').optional().trim().isLength({ max: 2000 }),
  body('phone').optional().trim().isLength({ max: 30 }),
  body('email').optional().trim().isEmail().isLength({ max: 150 }),
  body('address').optional().trim().isLength({ max: 300 }),
  body('city').optional().trim().isLength({ max: 100 }),
  body('state').optional().trim().isLength({ max: 100 }),
  body('country').optional().trim().isLength({ max: 100 }),
  body('postalCode').optional().trim().isLength({ max: 20 }),
  body('doctorProfileIds').optional().isArray(),
  body('doctorProfileIds.*').optional().isMongoId(),
  workingHoursDto,
  ...workingHoursItemDto,
  body('location').optional().isObject(),
  ...locationDto,
];

const assignDoctorsDto = [
  body('doctorProfileIds').isArray({ min: 0 }),
  body('doctorProfileIds.*').isMongoId(),
];

module.exports = {
  clinicIdParam,
  listClinicsQueryDto,
  createClinicDto,
  updateClinicDto,
  updateMyClinicDto,
  assignDoctorsDto,
};

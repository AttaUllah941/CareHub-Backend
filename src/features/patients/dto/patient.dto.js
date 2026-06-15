const { body, param, query } = require('express-validator');
const { MAX_LIMIT } = require('../../../shared/constants/pagination.constants');
const { BLOOD_GROUPS } = require('../../../shared/enums/bloodGroup.enum');
const { ALLERGY_SEVERITIES } = require('../../../shared/enums/allergySeverity.enum');

const patientIdParam = [param('id').isMongoId().withMessage('Invalid patient profile ID')];

const listPatientsQueryDto = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: MAX_LIMIT }),
  query('search').optional().trim().isLength({ max: 100 }),
  query('bloodGroup').optional().isIn(BLOOD_GROUPS),
  query('isActive').optional().isIn(['true', 'false']),
  query('sortBy').optional().isIn(['createdAt', 'bloodGroup', 'dateOfBirth']),
  query('sortOrder').optional().isIn(['asc', 'desc']),
];

const profileFieldsDto = [
  body('gender').optional().isIn(['MALE', 'FEMALE', 'OTHER']),
  body('dateOfBirth').optional().isISO8601(),
  body('address').optional().trim().isLength({ max: 300 }),
  body('city').optional().trim().isLength({ max: 100 }),
  body('country').optional().trim().isLength({ max: 100 }),
  body('bloodGroup').optional().isIn(BLOOD_GROUPS),
  body('profileImageUrl').optional({ values: 'falsy' }).trim().isURL(),
  body('allergies').optional().isArray(),
  body('allergies.*.name').optional().trim().notEmpty().isLength({ max: 150 }),
  body('allergies.*.severity').optional().isIn(ALLERGY_SEVERITIES),
  body('allergies.*.reaction').optional().trim().isLength({ max: 300 }),
  body('medicalInformation').optional().isObject(),
  body('medicalInformation.chronicConditions').optional().isArray(),
  body('medicalInformation.chronicConditions.*').optional().trim().isLength({ max: 200 }),
  body('medicalInformation.currentMedications').optional().isArray(),
  body('medicalInformation.currentMedications.*').optional().trim().isLength({ max: 200 }),
  body('medicalInformation.pastSurgeries').optional().isArray(),
  body('medicalInformation.pastSurgeries.*').optional().trim().isLength({ max: 200 }),
  body('medicalInformation.notes').optional().trim().isLength({ max: 2000 }),
  body('emergencyContact').optional().isObject(),
  body('emergencyContact.name').optional().trim().isLength({ max: 100 }),
  body('emergencyContact.relationship').optional().trim().isLength({ max: 50 }),
  body('emergencyContact.phone').optional().trim().isLength({ max: 30 }),
  body('emergencyContact.email').optional().trim().isEmail().isLength({ max: 150 }),
  body('emergencyContact.address').optional().trim().isLength({ max: 300 }),
];

const createPatientDto = [
  body('firstName').trim().notEmpty().isLength({ max: 50 }),
  body('lastName').trim().notEmpty().isLength({ max: 50 }),
  body('email').trim().isEmail().normalizeEmail(),
  body('phone').trim().notEmpty().matches(/^\+?[1-9]\d{7,14}$/),
  body('password').isLength({ min: 8 }),
  ...profileFieldsDto,
];

const updatePatientDto = [
  ...patientIdParam,
  body('firstName').optional().trim().notEmpty().isLength({ max: 50 }),
  body('lastName').optional().trim().notEmpty().isLength({ max: 50 }),
  body('email').optional().trim().isEmail().normalizeEmail(),
  body('phone').optional().trim().matches(/^\+?[1-9]\d{7,14}$/),
  body('isActive').optional().isBoolean(),
  ...profileFieldsDto,
];

const createMyProfileDto = [...profileFieldsDto];
const updateMyProfileDto = [...profileFieldsDto];

module.exports = {
  patientIdParam,
  listPatientsQueryDto,
  createPatientDto,
  updatePatientDto,
  createMyProfileDto,
  updateMyProfileDto,
};

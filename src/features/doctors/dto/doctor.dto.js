const { body, param, query } = require('express-validator');
const { MAX_LIMIT } = require('../../../shared/constants/pagination.constants');
const { DOCTOR_VERIFICATION_STATUSES } = require('../../../shared/enums/doctorVerificationStatus.enum');

const doctorIdParam = [param('id').isMongoId().withMessage('Invalid doctor profile ID')];

const listDoctorsQueryDto = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: MAX_LIMIT }),
  query('search').optional().trim().isLength({ max: 100 }),
  query('verificationStatus').optional().isIn(DOCTOR_VERIFICATION_STATUSES),
  query('specialtyId').optional().isMongoId(),
  query('isActive').optional().isIn(['true', 'false']),
  query('sortBy').optional().isIn(['createdAt', 'consultationFee', 'yearsOfExperience', 'verificationStatus']),
  query('sortOrder').optional().isIn(['asc', 'desc']),
];

const searchDoctorsQueryDto = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: MAX_LIMIT }),
  query('name').optional().trim().isLength({ max: 100 }),
  query('specialtyId').optional().isMongoId(),
  query('specialtySlug').optional().trim().isLength({ max: 100 }),
  query('clinicId').optional().isMongoId(),
  query('city').optional().trim().isLength({ max: 100 }),
  query('minFee').optional().isFloat({ min: 0 }),
  query('maxFee').optional().isFloat({ min: 0 }),
  query('languageId').optional().isMongoId(),
  query('gender').optional().isIn(['MALE', 'FEMALE', 'OTHER']),
  query('minExperience').optional().isInt({ min: 0, max: 70 }),
  query('maxExperience').optional().isInt({ min: 0, max: 70 }),
  query('availableDay').optional().isInt({ min: 0, max: 6 }),
  query('availableDate').optional().isISO8601(),
  query('sortBy').optional().isIn(['createdAt', 'consultationFee', 'yearsOfExperience']),
  query('sortOrder').optional().isIn(['asc', 'desc']),
];

const publicSearchDoctorsQueryDto = [...searchDoctorsQueryDto];

const qualificationDto = {
  degree: body('qualifications.*.degree').optional().trim().notEmpty().isLength({ max: 150 }),
  institution: body('qualifications.*.institution').optional().trim().notEmpty().isLength({ max: 200 }),
  year: body('qualifications.*.year').optional().isInt({ min: 1950, max: 2100 }),
  certificateUrl: body('qualifications.*.certificateUrl').optional().trim().isURL(),
};

const workHistoryDto = {
  organization: body('workHistory.*.organization').optional().trim().notEmpty().isLength({ max: 200 }),
  position: body('workHistory.*.position').optional().trim().notEmpty().isLength({ max: 150 }),
  startYear: body('workHistory.*.startYear').optional().isInt({ min: 1950, max: 2100 }),
  endYear: body('workHistory.*.endYear').optional().isInt({ min: 1950, max: 2100 }),
  isCurrent: body('workHistory.*.isCurrent').optional().isBoolean(),
};

const profileFieldsDto = [
  body('gender').optional().isIn(['MALE', 'FEMALE', 'OTHER']),
  body('dateOfBirth').optional().isISO8601(),
  body('address').optional().trim().isLength({ max: 300 }),
  body('city').optional().trim().isLength({ max: 100 }),
  body('country').optional().trim().isLength({ max: 100 }),
  body('bio').optional().trim().isLength({ max: 1000 }),
  body('title').optional().trim().isLength({ max: 50 }),
  body('licenseNumber').optional().trim().isLength({ max: 100 }),
  body('licenseAuthority').optional().trim().isLength({ max: 150 }),
  body('medicalRegistrationNumber').optional().trim().isLength({ max: 100 }),
  body('about').optional().trim().isLength({ max: 2000 }),
  body('yearsOfExperience').optional().isInt({ min: 0, max: 70 }),
  body('experienceSummary').optional().trim().isLength({ max: 2000 }),
  body('specialtyIds').optional().isArray(),
  body('specialtyIds.*').optional().isMongoId(),
  body('languageIds').optional().isArray(),
  body('languageIds.*').optional().isMongoId(),
  body('qualifications').optional().isArray(),
  ...Object.values(qualificationDto),
  body('workHistory').optional().isArray(),
  ...Object.values(workHistoryDto),
  body('consultationFee').optional().isFloat({ min: 0 }),
  body('currency').optional().trim().isLength({ max: 10 }),
  body('profileImageUrl').optional({ values: 'falsy' }).trim().isURL(),
];

const createDoctorDto = [
  body('firstName').trim().notEmpty().isLength({ max: 50 }),
  body('lastName').trim().notEmpty().isLength({ max: 50 }),
  body('email').trim().isEmail().normalizeEmail(),
  body('phone').trim().notEmpty().matches(/^\+?[1-9]\d{7,14}$/),
  body('password').isLength({ min: 8 }),
  ...profileFieldsDto,
];

const updateDoctorDto = [
  ...doctorIdParam,
  body('firstName').optional().trim().notEmpty().isLength({ max: 50 }),
  body('lastName').optional().trim().notEmpty().isLength({ max: 50 }),
  body('email').optional().trim().isEmail().normalizeEmail(),
  body('phone').optional().trim().matches(/^\+?[1-9]\d{7,14}$/),
  body('isActive').optional().isBoolean(),
  ...profileFieldsDto,
  body('verificationStatus').optional().isIn(DOCTOR_VERIFICATION_STATUSES),
  body('verificationNotes').optional().trim().isLength({ max: 500 }),
];

const updateMyProfileDto = [...profileFieldsDto];

const createMyProfileDto = [...profileFieldsDto];

const verifyDoctorDto = [
  ...doctorIdParam,
  body('verificationStatus').isIn(DOCTOR_VERIFICATION_STATUSES),
  body('verificationNotes').optional().trim().isLength({ max: 500 }),
];

module.exports = {
  doctorIdParam,
  listDoctorsQueryDto,
  searchDoctorsQueryDto,
  publicSearchDoctorsQueryDto,
  createDoctorDto,
  updateDoctorDto,
  updateMyProfileDto,
  createMyProfileDto,
  verifyDoctorDto,
};

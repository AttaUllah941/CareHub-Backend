const { body, param, query } = require('express-validator');
const { MAX_LIMIT } = require('../../../shared/constants/pagination.constants');
const { FAMILY_RELATIONSHIPS } = require('../../../shared/enums/familyRelationship.enum');

const familyMemberIdParam = [param('id').isMongoId().withMessage('Invalid family member ID')];
const patientProfileIdParam = [
  param('patientProfileId').isMongoId().withMessage('Invalid patient profile ID'),
];

const memberFieldsDto = [
  body('relationship').isIn(FAMILY_RELATIONSHIPS),
  body('firstName').trim().notEmpty().isLength({ max: 50 }),
  body('lastName').trim().notEmpty().isLength({ max: 50 }),
  body('gender').optional().isIn(['MALE', 'FEMALE', 'OTHER']),
  body('dateOfBirth').optional().isISO8601(),
  body('phone').optional().trim().isLength({ max: 30 }),
  body('email').optional().trim().isEmail().isLength({ max: 150 }),
  body('notes').optional().trim().isLength({ max: 500 }),
];

const listFamilyMembersQueryDto = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: MAX_LIMIT }),
  query('patientProfileId').optional().isMongoId(),
  query('relationship').optional().isIn(FAMILY_RELATIONSHIPS),
  query('search').optional().trim().isLength({ max: 100 }),
  query('isActive').optional().isIn(['true', 'false']),
  query('sortBy').optional().isIn(['createdAt', 'firstName', 'relationship']),
  query('sortOrder').optional().isIn(['asc', 'desc']),
];

const createFamilyMemberDto = [
  body('patientProfileId').isMongoId(),
  ...memberFieldsDto,
];

const updateFamilyMemberDto = [
  ...familyMemberIdParam,
  body('relationship').optional().isIn(FAMILY_RELATIONSHIPS),
  body('firstName').optional().trim().notEmpty().isLength({ max: 50 }),
  body('lastName').optional().trim().notEmpty().isLength({ max: 50 }),
  body('gender').optional().isIn(['MALE', 'FEMALE', 'OTHER']),
  body('dateOfBirth').optional().isISO8601(),
  body('phone').optional().trim().isLength({ max: 30 }),
  body('email').optional().trim().isEmail().isLength({ max: 150 }),
  body('notes').optional().trim().isLength({ max: 500 }),
  body('isActive').optional().isBoolean(),
];

const createMyFamilyMemberDto = [...memberFieldsDto];

const updateMyFamilyMemberDto = [
  ...familyMemberIdParam,
  body('relationship').optional().isIn(FAMILY_RELATIONSHIPS),
  body('firstName').optional().trim().notEmpty().isLength({ max: 50 }),
  body('lastName').optional().trim().notEmpty().isLength({ max: 50 }),
  body('gender').optional().isIn(['MALE', 'FEMALE', 'OTHER']),
  body('dateOfBirth').optional().isISO8601(),
  body('phone').optional().trim().isLength({ max: 30 }),
  body('email').optional().trim().isEmail().isLength({ max: 150 }),
  body('notes').optional().trim().isLength({ max: 500 }),
];

module.exports = {
  familyMemberIdParam,
  patientProfileIdParam,
  listFamilyMembersQueryDto,
  createFamilyMemberDto,
  updateFamilyMemberDto,
  createMyFamilyMemberDto,
  updateMyFamilyMemberDto,
};

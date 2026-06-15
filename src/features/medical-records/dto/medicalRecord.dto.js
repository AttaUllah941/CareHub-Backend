const { body, param, query } = require('express-validator');
const { MAX_LIMIT } = require('../../../shared/constants/pagination.constants');
const { MEDICAL_RECORD_TYPES } = require('../../../shared/enums/medicalRecordType.enum');

const recordIdParam = [param('id').isMongoId().withMessage('Invalid record ID')];
const patientProfileIdParam = [param('patientProfileId').isMongoId()];
const consultationIdParam = [param('consultationId').isMongoId()];

const uploadRecordDto = [
  body('recordType').isIn(MEDICAL_RECORD_TYPES),
  body('title').trim().notEmpty().isLength({ max: 200 }),
  body('description').optional().trim().isLength({ max: 2000 }),
  body('patientProfileId').optional().isMongoId(),
  body('familyMemberId').optional({ values: 'falsy' }).isMongoId(),
  body('consultationId').optional({ values: 'falsy' }).isMongoId(),
  body('appointmentId').optional({ values: 'falsy' }).isMongoId(),
];

const uploadVersionDto = [
  body('changeNote').optional().trim().isLength({ max: 500 }),
];

const updateRecordDto = [
  body('title').optional().trim().notEmpty().isLength({ max: 200 }),
  body('description').optional().trim().isLength({ max: 2000 }),
  body('recordType').optional().isIn(MEDICAL_RECORD_TYPES),
];

const listRecordsQueryDto = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: MAX_LIMIT }),
  query('patientProfileId').optional().isMongoId(),
  query('recordType').optional().isIn(MEDICAL_RECORD_TYPES),
  query('search').optional().trim().isLength({ max: 100 }),
  query('sortBy').optional().isIn(['createdAt', 'updatedAt', 'title']),
  query('sortOrder').optional().isIn(['asc', 'desc']),
];

const myRecordsQueryDto = [query('recordType').optional().isIn(MEDICAL_RECORD_TYPES)];

const downloadQueryDto = [query('version').optional().isInt({ min: 1 })];

module.exports = {
  recordIdParam,
  patientProfileIdParam,
  consultationIdParam,
  uploadRecordDto,
  uploadVersionDto,
  updateRecordDto,
  listRecordsQueryDto,
  myRecordsQueryDto,
  downloadQueryDto,
};

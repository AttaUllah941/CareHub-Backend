const { body, param, query } = require('express-validator');
const { MAX_LIMIT } = require('../../../shared/constants/pagination.constants');

const prescriptionIdParam = [param('id').isMongoId().withMessage('Invalid prescription ID')];
const consultationIdParam = [param('consultationId').isMongoId().withMessage('Invalid consultation ID')];

const medicineDto = [
  body('medicines').isArray({ min: 1 }),
  body('medicines.*.name').trim().notEmpty().isLength({ max: 200 }),
  body('medicines.*.dosage').trim().notEmpty().isLength({ max: 200 }),
  body('medicines.*.duration').trim().notEmpty().isLength({ max: 100 }),
  body('medicines.*.instructions').optional().trim().isLength({ max: 1000 }),
];

const createPrescriptionDto = [
  ...consultationIdParam,
  ...medicineDto,
  body('notes').optional().trim().isLength({ max: 2000 }),
];

const updatePrescriptionDto = [
  body('medicines').optional().isArray({ min: 1 }),
  body('medicines.*.name').optional().trim().notEmpty().isLength({ max: 200 }),
  body('medicines.*.dosage').optional().trim().notEmpty().isLength({ max: 200 }),
  body('medicines.*.duration').optional().trim().notEmpty().isLength({ max: 100 }),
  body('medicines.*.instructions').optional().trim().isLength({ max: 1000 }),
  body('notes').optional().trim().isLength({ max: 2000 }),
];

const listPrescriptionsQueryDto = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: MAX_LIMIT }),
  query('patientProfileId').optional().isMongoId(),
  query('doctorProfileId').optional().isMongoId(),
  query('consultationId').optional().isMongoId(),
  query('search').optional().trim().isLength({ max: 100 }),
  query('sortBy').optional().isIn(['createdAt', 'updatedAt']),
  query('sortOrder').optional().isIn(['asc', 'desc']),
];

module.exports = {
  prescriptionIdParam,
  consultationIdParam,
  createPrescriptionDto,
  updatePrescriptionDto,
  listPrescriptionsQueryDto,
};

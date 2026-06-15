const { body, param, query } = require('express-validator');
const { MAX_LIMIT } = require('../../../shared/constants/pagination.constants');

const consultationIdParam = [param('id').isMongoId().withMessage('Invalid consultation ID')];
const appointmentIdParam = [param('appointmentId').isMongoId().withMessage('Invalid appointment ID')];

const consultationFieldsDto = [
  body('diagnosis').optional().trim().isLength({ max: 2000 }),
  body('observations').optional().trim().isLength({ max: 5000 }),
  body('doctorNotes').optional().trim().isLength({ max: 5000 }),
  body('recommendations').optional().trim().isLength({ max: 5000 }),
];

const createConsultationDto = [...appointmentIdParam, ...consultationFieldsDto];

const updateConsultationDto = [...consultationFieldsDto];

const listConsultationsQueryDto = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: MAX_LIMIT }),
  query('patientProfileId').optional().isMongoId(),
  query('doctorProfileId').optional().isMongoId(),
  query('appointmentId').optional().isMongoId(),
  query('search').optional().trim().isLength({ max: 100 }),
  query('sortBy').optional().isIn(['createdAt', 'updatedAt']),
  query('sortOrder').optional().isIn(['asc', 'desc']),
];

module.exports = {
  consultationIdParam,
  appointmentIdParam,
  createConsultationDto,
  updateConsultationDto,
  listConsultationsQueryDto,
};

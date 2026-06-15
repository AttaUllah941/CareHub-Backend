const { body, param, query } = require('express-validator');
const { MAX_LIMIT } = require('../../../shared/constants/pagination.constants');

const specialtySlugRegex = /^[a-z][a-z0-9-]*$/;

const specialtyIdParam = [param('id').isMongoId().withMessage('Invalid specialty ID')];

const listSpecialtiesQueryDto = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: MAX_LIMIT }),
  query('search').optional().trim().isLength({ max: 100 }),
  query('isActive').optional().isIn(['true', 'false']),
  query('sortBy').optional().isIn(['name', 'slug', 'createdAt', 'isActive']),
  query('sortOrder').optional().isIn(['asc', 'desc']),
];

const createSpecialtyDto = [
  body('name').trim().notEmpty().isLength({ max: 100 }),
  body('slug')
    .trim()
    .notEmpty()
    .matches(specialtySlugRegex)
    .withMessage('Slug must be lowercase alphanumeric with hyphens'),
  body('description').optional().trim().isLength({ max: 500 }),
];

const updateSpecialtyDto = [
  ...specialtyIdParam,
  body('name').optional().trim().notEmpty().isLength({ max: 100 }),
  body('slug').optional().trim().matches(specialtySlugRegex),
  body('description').optional().trim().isLength({ max: 500 }),
  body('isActive').optional().isBoolean(),
];

module.exports = {
  specialtyIdParam,
  listSpecialtiesQueryDto,
  createSpecialtyDto,
  updateSpecialtyDto,
};

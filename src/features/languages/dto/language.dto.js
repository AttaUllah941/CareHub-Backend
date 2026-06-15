const { body, param, query } = require('express-validator');
const { MAX_LIMIT } = require('../../../shared/constants/pagination.constants');

const languageCodeRegex = /^[a-z]{2,3}$/;

const languageIdParam = [param('id').isMongoId().withMessage('Invalid language ID')];

const listLanguagesQueryDto = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: MAX_LIMIT }),
  query('search').optional().trim().isLength({ max: 100 }),
  query('isActive').optional().isIn(['true', 'false']),
  query('sortBy').optional().isIn(['name', 'code', 'nativeName', 'createdAt', 'isActive']),
  query('sortOrder').optional().isIn(['asc', 'desc']),
];

const createLanguageDto = [
  body('name').trim().notEmpty().isLength({ max: 100 }),
  body('code')
    .trim()
    .notEmpty()
    .matches(languageCodeRegex)
    .withMessage('Code must be a 2–3 letter ISO 639-1 code'),
  body('nativeName').optional().trim().isLength({ max: 100 }),
  body('description').optional().trim().isLength({ max: 500 }),
];

const updateLanguageDto = [
  ...languageIdParam,
  body('name').optional().trim().notEmpty().isLength({ max: 100 }),
  body('code').optional().trim().matches(languageCodeRegex),
  body('nativeName').optional().trim().isLength({ max: 100 }),
  body('description').optional().trim().isLength({ max: 500 }),
  body('isActive').optional().isBoolean(),
];

module.exports = {
  languageIdParam,
  listLanguagesQueryDto,
  createLanguageDto,
  updateLanguageDto,
};

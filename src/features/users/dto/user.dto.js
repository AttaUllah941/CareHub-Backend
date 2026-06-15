const { body, param, query } = require('express-validator');
const { UserRole } = require('../../../shared/enums/userRole.enum');
const {
  ALLOWED_SORT_FIELDS,
  SORT_ORDERS,
  MAX_LIMIT,
} = require('../../../shared/constants/pagination.constants');

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

const userIdParam = [
  param('id').isMongoId().withMessage('Invalid user ID'),
];

const listUsersQueryDto = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: MAX_LIMIT })
    .withMessage(`Limit must be between 1 and ${MAX_LIMIT}`),
  query('search').optional().trim().isLength({ max: 100 }).withMessage('Search term too long'),
  query('role').optional().isIn(Object.values(UserRole)).withMessage('Invalid role filter'),
  query('isActive')
    .optional()
    .isIn(['true', 'false'])
    .withMessage('isActive must be true or false'),
  query('isEmailVerified')
    .optional()
    .isIn(['true', 'false'])
    .withMessage('isEmailVerified must be true or false'),
  query('sortBy')
    .optional()
    .isIn(ALLOWED_SORT_FIELDS)
    .withMessage('Invalid sort field'),
  query('sortOrder')
    .optional()
    .isIn(SORT_ORDERS)
    .withMessage('Sort order must be asc or desc'),
];

const createUserDto = [
  body('firstName')
    .trim()
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ max: 50 })
    .withMessage('First name cannot exceed 50 characters'),
  body('lastName')
    .trim()
    .notEmpty()
    .withMessage('Last name is required')
    .isLength({ max: 50 })
    .withMessage('Last name cannot exceed 50 characters'),
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail(),
  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required')
    .matches(/^\+?[1-9]\d{7,14}$/)
    .withMessage('Invalid phone number format'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .matches(PASSWORD_REGEX)
    .withMessage(
      'Password must contain at least 8 characters, one uppercase, one lowercase, one number, and one special character',
    ),
  body('role')
    .notEmpty()
    .withMessage('Role is required')
    .isIn(Object.values(UserRole))
    .withMessage('Invalid role'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
  body('isEmailVerified').optional().isBoolean().withMessage('isEmailVerified must be a boolean'),
];

const updateUserDto = [
  ...userIdParam,
  body('firstName')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('First name cannot be empty')
    .isLength({ max: 50 })
    .withMessage('First name cannot exceed 50 characters'),
  body('lastName')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Last name cannot be empty')
    .isLength({ max: 50 })
    .withMessage('Last name cannot exceed 50 characters'),
  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail(),
  body('phone')
    .optional()
    .trim()
    .matches(/^\+?[1-9]\d{7,14}$/)
    .withMessage('Invalid phone number format'),
  body('password')
    .optional()
    .matches(PASSWORD_REGEX)
    .withMessage(
      'Password must contain at least 8 characters, one uppercase, one lowercase, one number, and one special character',
    ),
  body('role').optional().isIn(Object.values(UserRole)).withMessage('Invalid role'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
  body('isEmailVerified').optional().isBoolean().withMessage('isEmailVerified must be a boolean'),
];

module.exports = {
  userIdParam,
  listUsersQueryDto,
  createUserDto,
  updateUserDto,
};

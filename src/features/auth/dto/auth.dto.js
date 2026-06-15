const { body } = require('express-validator');
const { UserRole } = require('../../../shared/enums/userRole.enum');

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

/**
 * DTO validation rules for user registration.
 */
const registerDto = [
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
];

/**
 * DTO validation rules for user login.
 */
const loginDto = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

/**
 * DTO validation rules for token refresh.
 */
const refreshTokenDto = [
  body('refreshToken').notEmpty().withMessage('Refresh token is required'),
];

/**
 * DTO validation rules for forgot password.
 */
const forgotPasswordDto = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail(),
];

/**
 * DTO validation rules for reset password.
 */
const resetPasswordDto = [
  body('token').notEmpty().withMessage('Reset token is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .matches(PASSWORD_REGEX)
    .withMessage(
      'Password must contain at least 8 characters, one uppercase, one lowercase, one number, and one special character',
    ),
  body('confirmPassword')
    .notEmpty()
    .withMessage('Confirm password is required')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return true;
    }),
];

/**
 * DTO validation rules for change password (authenticated).
 */
const changePasswordDto = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .notEmpty()
    .withMessage('New password is required')
    .matches(PASSWORD_REGEX)
    .withMessage(
      'Password must contain at least 8 characters, one uppercase, one lowercase, one number, and one special character',
    ),
  body('confirmPassword')
    .notEmpty()
    .withMessage('Confirm password is required')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Passwords do not match');
      }
      return true;
    }),
];

module.exports = {
  registerDto,
  loginDto,
  refreshTokenDto,
  forgotPasswordDto,
  resetPasswordDto,
  changePasswordDto,
};

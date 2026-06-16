const { Router } = require('express');
const container = require('../../../core/container');
const validate = require('../../../core/middleware/validate.middleware');
const { authenticate, authorize } = require('../../../core/middleware/auth.middleware');
const { authRateLimiter } = require('../../../core/middleware/rateLimiter.middleware');
const { registerDto, loginDto, refreshTokenDto, forgotPasswordDto, resetPasswordDto, changePasswordDto } = require('../dto/auth.dto');
const { UserRole } = require('../../../shared/enums/userRole.enum');

const router = Router();
const authController = container.resolve('authController');

// Register a new user
router.post('/register', authRateLimiter, registerDto, validate, authController.register);

// Register a new admin user
router.post(
  '/register/admin',
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  registerDto,
  validate,
  authController.register,
);

// Login a user
router.post('/login', authRateLimiter, loginDto, validate, authController.login);

// Refresh a token
router.post('/refresh', refreshTokenDto, validate, authController.refreshToken);

// Logout a user
router.post('/logout', authenticate, authController.logout);

// Get the profile of the authenticated user
router.get('/me', authenticate, authController.getProfile);

// Forgot password
router.post(
  '/forgot-password',
  authRateLimiter,
  forgotPasswordDto,
  validate,
  authController.forgotPassword,
);

// Reset password
router.post('/reset-password', authRateLimiter, resetPasswordDto, validate, authController.resetPassword);

// Change password
router.post(
  '/change-password',
  authenticate,
  changePasswordDto,
  validate,
  authController.changePassword,
);

module.exports = router;

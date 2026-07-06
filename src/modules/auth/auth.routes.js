const { Router } = require('express');
const asyncHandler = require('../../core/utils/asyncHandler');
const { authenticate } = require('../../core/middleware/auth.middleware');
const { validate } = require('../../shared/middleware/validate.middleware');
const { authLimiter } = require('../../shared/middleware/rateLimit.middleware');
const authController = require('./auth.controller');
const {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  refreshSchema,
} = require('./auth.validator');

const router = Router();

/**
 * @openapi
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new user account
 */
router.post(
  '/register',
  authLimiter,
  validate(registerSchema),
  asyncHandler(authController.register),
);

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login and receive JWT access token
 */
router.post(
  '/login',
  authLimiter,
  validate(loginSchema),
  asyncHandler(authController.login),
);

router.post(
  '/refresh',
  authLimiter,
  validate(refreshSchema),
  asyncHandler(authController.refresh),
);

/**
 * @openapi
 * /auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get current authenticated user profile
 */
router.get('/me', authenticate, asyncHandler(authController.getMe));

router.post(
  '/forgot-password',
  authLimiter,
  validate(forgotPasswordSchema),
  asyncHandler(authController.requestPasswordReset),
);

router.post(
  '/reset-password',
  authLimiter,
  validate(resetPasswordSchema),
  asyncHandler(authController.resetPassword),
);

module.exports = router;

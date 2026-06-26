const express = require('express');
const authController = require('./auth.controller');
const {
  registerSchema,
  loginSchema,
  refreshSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
} = require('./auth.validator');
const { validateBody } = require('../../shared/middleware/validate.middleware');
const { authenticate } = require('../../shared/middleware/auth.middleware');
const { authRateLimiter } = require('../../shared/middleware/rateLimit.middleware');

const router = express.Router();

router.post('/register', authRateLimiter, validateBody(registerSchema), authController.register);
router.post('/login', authRateLimiter, validateBody(loginSchema), authController.login);
router.post('/refresh', validateBody(refreshSchema), authController.refresh);
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.getProfile);
router.post(
  '/forgot-password',
  authRateLimiter,
  validateBody(forgotPasswordSchema),
  authController.forgotPassword,
);
router.post('/reset-password', validateBody(resetPasswordSchema), authController.resetPassword);
router.post(
  '/change-password',
  authenticate,
  validateBody(changePasswordSchema),
  authController.changePassword,
);

module.exports = router;

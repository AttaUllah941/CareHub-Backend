const rateLimit = require('express-rate-limit');
const config = require('../../config');

/**
 * Global rate limiter to protect against abuse at scale.
 * Configurable via environment variables for per-environment tuning.
 */
const globalRateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
  },
});

/**
 * Stricter rate limiter for auth endpoints (brute-force protection).
 */
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.',
  },
});

module.exports = { globalRateLimiter, authRateLimiter };

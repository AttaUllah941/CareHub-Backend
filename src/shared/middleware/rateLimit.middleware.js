const rateLimit = require('express-rate-limit');
const config = require('../../config');

const globalRateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/health' || req.url === '/health',
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
  },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.',
  },
});

const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many write requests, please try again later.',
  },
});

/** Anonymous document uploads (doctor sign-up) — keep abuse of storage low. */
const anonymousUploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many uploads, please try again later.',
  },
});

/** Per-user limiter for AI calls (runs after authenticate, so req.user is verified). */
const perUser = (req) => req.user?.id || req.ip;

const aiChatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: config.ai.chatRatePerMinute,
  keyGenerator: perUser,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'You are sending messages too quickly. Please wait a moment.',
  },
});

const aiActionLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  keyGenerator: perUser,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests. Please wait a moment.',
  },
});

module.exports = {
  aiChatLimiter,
  aiActionLimiter,
  globalRateLimiter,
  authLimiter,
  anonymousUploadLimiter,
  writeLimiter,
};

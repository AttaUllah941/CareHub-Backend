const {
  globalRateLimiter,
  authLimiter,
  writeLimiter,
} = require('../../shared/middleware/rateLimit.middleware');

module.exports = {
  globalRateLimiter,
  authRateLimiter: authLimiter,
  writeLimiter,
};

/**
 * Kept for backwards-compatible imports. The single implementation lives in
 * core/middleware/auth.middleware.js.
 */
const { authenticate, optionalAuthenticate } = require('../../core/middleware/auth.middleware');

module.exports = { authenticate, optionalAuthenticate };

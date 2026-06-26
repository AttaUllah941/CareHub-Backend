const crypto = require('crypto');

/**
 * Generates a unique video-consultation room reference (e.g. VC-XXXXXXXX).
 */
const generateBookingRef = () => {
  const suffix = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `VC-${suffix}`;
};

module.exports = { generateBookingRef };

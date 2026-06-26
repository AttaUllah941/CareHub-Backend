const crypto = require('crypto');

/**
 * Generates a unique booking reference (e.g. VC-XXXXXX, IC-XXXXXX).
 */
const generateBookingRef = (consultationType) => {
  const prefix = consultationType === 'video' ? 'VC' : 'IC';
  const suffix = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `${prefix}-${suffix}`;
};

module.exports = { generateBookingRef };

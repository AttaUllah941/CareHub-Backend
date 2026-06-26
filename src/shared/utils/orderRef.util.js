const crypto = require('crypto');

/**
 * Generates a unique medicine order reference (e.g. MO-XXXXXXXX).
 */
const generateOrderRef = () => {
  const suffix = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `MO-${suffix}`;
};

module.exports = { generateOrderRef };

const crypto = require('crypto');

/**
 * Generates a cryptographically secure password reset token.
 * Returns both the plain token (sent to user) and hashed token (stored in DB).
 */
const generatePasswordResetToken = () => {
  const resetToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  return { resetToken, hashedToken };
};

/**
 * Hashes a plain reset token for DB lookup.
 */
const hashPasswordResetToken = (token) =>
  crypto.createHash('sha256').update(token).digest('hex');

module.exports = { generatePasswordResetToken, hashPasswordResetToken };

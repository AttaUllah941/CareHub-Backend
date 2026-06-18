const config = require('../../config');

/**
 * Sends password reset email notification.
 * In production, integrate with SendGrid, AWS SES, or similar.
 */
const sendPasswordResetEmail = async (email, resetToken) => {
  const resetUrl = `${config.frontend.url}/auth/reset-password?token=${resetToken}`;

  return { resetUrl };
};

module.exports = { sendPasswordResetEmail };

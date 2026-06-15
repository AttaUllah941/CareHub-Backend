const logger = require('./logger');
const config = require('../../config');

/**
 * Sends password reset email notification.
 * In production, integrate with SendGrid, AWS SES, or similar.
 * In development, logs the reset link to the console.
 */
const sendPasswordResetEmail = async (email, resetToken) => {
  const resetUrl = `${config.frontend.url}/auth/reset-password?token=${resetToken}`;

  if (config.isProduction) {
    // TODO: Integrate email provider (SendGrid / AWS SES)
    logger.info(`Password reset email queued for ${email}`);
  } else {
    logger.info(`[DEV] Password reset link for ${email}: ${resetUrl}`);
  }

  return { resetUrl };
};

module.exports = { sendPasswordResetEmail };

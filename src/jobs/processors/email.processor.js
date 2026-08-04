const nodemailer = require('nodemailer');
const config = require('../../config');
const logger = require('../../core/utils/logger');

let transporter = null;

const isSmtpConfigured = () =>
  Boolean(config.smtp.host && config.smtp.user && config.smtp.pass);

const getTransporter = () => {
  if (!isSmtpConfigured()) {
    return null;
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: {
        user: config.smtp.user,
        pass: config.smtp.pass,
      },
      connectionTimeout: 15_000,
      greetingTimeout: 15_000,
      socketTimeout: 30_000,
    });
  }

  return transporter;
};

/**
 * @returns {Promise<{ delivered: boolean, reason?: string }>}
 */
const processEmailJob = async (payload) => {
  const { to, subject, text, html } = payload;

  if (!to || !subject) {
    logger.warn('Email job missing required fields', { to, subject });
    return { delivered: false, reason: 'missing_fields' };
  }

  const mailer = getTransporter();

  if (!mailer) {
    logger.warn(
      `Email not sent (SMTP not configured). Set SMTP_HOST, SMTP_USER, SMTP_PASS. to=${to} subject=${subject}`,
    );
    logger.info(`[email-fallback] ${JSON.stringify({ to, subject, text })}`);
    return { delivered: false, reason: 'smtp_not_configured' };
  }

  try {
    await mailer.sendMail({
      from: config.smtp.from,
      to,
      subject,
      text,
      html: html || undefined,
    });
    logger.info(`Email sent to ${to}: ${subject}`);
    return { delivered: true };
  } catch (error) {
    logger.error(`Failed to send email to ${to}: ${error.message}`);
    return { delivered: false, reason: 'send_failed', error: error.message };
  }
};

const startEmailProcessor = (queue) => {
  if (!queue) {
    return null;
  }

  queue.process(async (job) => {
    const result = await processEmailJob(job.data);
    if (!result.delivered) {
      throw new Error(result.error || result.reason || 'Email delivery failed');
    }
  });

  queue.on('failed', (job, error) => {
    logger.error(`Email job ${job?.id} failed: ${error.message}`);
  });

  logger.info('Email processor started');
  return queue;
};

module.exports = {
  isSmtpConfigured,
  processEmailJob,
  startEmailProcessor,
};

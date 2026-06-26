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
    });
  }

  return transporter;
};

const processEmailJob = async (payload) => {
  const { to, subject, text, html } = payload;

  if (!to || !subject) {
    logger.warn('Email job missing required fields', { to, subject });
    return;
  }

  const mailer = getTransporter();

  if (!mailer) {
    console.log('[email-fallback]', JSON.stringify({ to, subject, text, html }, null, 2));
    return;
  }

  await mailer.sendMail({
    from: config.smtp.from,
    to,
    subject,
    text,
    html: html || text,
  });

  logger.info(`Email sent to ${to}: ${subject}`);
};

const startEmailProcessor = (queue) => {
  if (!queue) {
    return null;
  }

  queue.process(async (job) => {
    await processEmailJob(job.data);
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

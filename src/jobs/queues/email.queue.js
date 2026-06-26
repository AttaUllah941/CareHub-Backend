const Bull = require('bull');
const config = require('../../config');
const logger = require('../../core/utils/logger');
const { processEmailJob } = require('../processors/email.processor');

let emailQueue = null;
let queueReady = false;

const createEmailQueue = () => {
  if (!config.redis.enabled) {
    return null;
  }

  return new Bull('email', config.redis.url, {
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: 100,
      removeOnFail: 200,
    },
  });
};

const getEmailQueue = () => {
  if (!config.redis.enabled) {
    return null;
  }

  if (!emailQueue) {
    emailQueue = createEmailQueue();
  }

  return emailQueue;
};

const enqueueEmail = async (payload) => {
  const queue = getEmailQueue();

  if (!queue || !queueReady) {
    await processEmailJob(payload);
    return { queued: false, fallback: true };
  }

  const job = await queue.add(payload);
  return { queued: true, jobId: job.id };
};

const initEmailQueue = async () => {
  const queue = getEmailQueue();
  if (!queue) {
    queueReady = false;
    return null;
  }

  try {
    await queue.isReady();
    queueReady = true;
    logger.info('Email queue ready');
    return queue;
  } catch (error) {
    queueReady = false;
    logger.warn(`Email queue unavailable (${error.message}) — using in-process fallback`);
    return null;
  }
};

const closeEmailQueue = async () => {
  if (emailQueue) {
    await emailQueue.close();
    emailQueue = null;
    queueReady = false;
  }
};

module.exports = {
  getEmailQueue,
  enqueueEmail,
  initEmailQueue,
  closeEmailQueue,
};

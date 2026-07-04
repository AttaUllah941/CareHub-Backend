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
    redis: {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    },
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
  if (!config.redis.enabled || !queueReady) {
    await processEmailJob(payload);
    return { queued: false, fallback: true };
  }

  const queue = getEmailQueue();
  if (!queue) {
    await processEmailJob(payload);
    return { queued: false, fallback: true };
  }

  try {
    const job = await queue.add(payload);
    return { queued: true, jobId: job.id };
  } catch (error) {
    queueReady = false;
    logger.warn(`Email queue add failed (${error.message}) — using in-process fallback`);
    await processEmailJob(payload);
    return { queued: false, fallback: true };
  }
};

const initEmailQueue = async (redisClient = null) => {
  if (!config.redis.enabled) {
    queueReady = false;
    return null;
  }

  if (!redisClient) {
    queueReady = false;
    logger.warn('Email queue unavailable — Redis not connected, using in-process fallback');
    return null;
  }

  try {
    await redisClient.ping();
  } catch (error) {
    queueReady = false;
    logger.warn(`Email queue unavailable (${error.message}) — using in-process fallback`);
    return null;
  }

  const queue = getEmailQueue();
  if (!queue) {
    queueReady = false;
    return null;
  }

  queueReady = true;
  logger.info('Email queue ready');
  return queue;
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

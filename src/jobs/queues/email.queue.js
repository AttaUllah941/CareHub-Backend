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

const runInProcessFallback = async (payload, { waitForDelivery }) => {
  if (waitForDelivery) {
    const result = await processEmailJob(payload);
    return { queued: false, fallback: true, ...result };
  }

  // Do not block HTTP responses on SMTP (can take seconds when Redis is down).
  setImmediate(() => {
    processEmailJob(payload).catch((error) => {
      logger.warn(`In-process email fallback failed: ${error.message}`);
    });
  });

  return { queued: false, fallback: true, delivered: true };
};

/**
 * @param {object} payload
 * @param {{ waitForDelivery?: boolean }} [options]
 *   waitForDelivery — when true (password reset), await SMTP in fallback mode so callers
 *   can report delivery failure. Default false keeps write APIs non-blocking.
 */
const enqueueEmail = async (payload, { waitForDelivery = false } = {}) => {
  if (!config.redis.enabled || !queueReady) {
    return runInProcessFallback(payload, { waitForDelivery });
  }

  const queue = getEmailQueue();
  if (!queue) {
    return runInProcessFallback(payload, { waitForDelivery });
  }

  try {
    const job = await queue.add(payload);
    // Queued for async delivery — treat as accepted; worker reports failures separately.
    return { queued: true, jobId: job.id, delivered: true };
  } catch (error) {
    queueReady = false;
    logger.warn(`Email queue add failed (${error.message}) — using in-process fallback`);
    return runInProcessFallback(payload, { waitForDelivery });
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

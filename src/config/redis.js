const Redis = require('ioredis');
const config = require('./index');
const logger = require('../core/utils/logger');

let redisClient = null;

/**
 * Creates a Redis client for Bull queues and caching.
 * Returns null when Redis is disabled or unavailable in development.
 */
const createRedisClient = () => {
  if (!config.redis.enabled) {
    return null;
  }

  const client = new Redis(config.redis.url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    lazyConnect: true,
  });

  client.on('error', (error) => {
    logger.warn(`Redis connection error: ${error.message}`);
  });

  return client;
};

const getRedisClient = () => {
  if (!config.redis.enabled) {
    return null;
  }

  if (!redisClient) {
    redisClient = createRedisClient();
  }

  return redisClient;
};

const connectRedis = async () => {
  const client = getRedisClient();
  if (!client) {
    logger.info('Redis is disabled — queues will run in-process fallback mode');
    return null;
  }

  try {
    if (client.status === 'wait') {
      await client.connect();
    }
    logger.info('Redis connected');
    return client;
  } catch (error) {
    logger.warn(`Redis unavailable (${error.message}) — using in-process queue fallback`);
    redisClient = null;
    return null;
  }
};

const disconnectRedis = async () => {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
};

module.exports = {
  createRedisClient,
  getRedisClient,
  connectRedis,
  disconnectRedis,
};

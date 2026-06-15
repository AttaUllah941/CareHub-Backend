const Redis = require('ioredis');
const config = require('../config');
const logger = require('../core/utils/logger');

let redisClient = null;

/**
 * Creates a singleton Redis client for caching, session blacklisting, and rate limiting.
 * Uses key prefixing for multi-tenant isolation at scale.
 */
const connectRedis = () => {
  if (redisClient) return redisClient;

  redisClient = new Redis({
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password,
    keyPrefix: config.redis.keyPrefix,
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    retryStrategy: (times) => Math.min(times * 50, 2000),
  });

  redisClient.on('connect', () => logger.info('Redis connected successfully'));
  redisClient.on('error', (err) => logger.error('Redis error:', err));

  return redisClient;
};

const getRedisClient = () => {
  if (!redisClient) {
    return connectRedis();
  }
  return redisClient;
};

const disconnectRedis = async () => {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    logger.info('Redis disconnected');
  }
};

module.exports = { connectRedis, getRedisClient, disconnectRedis };

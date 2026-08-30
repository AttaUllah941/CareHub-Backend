const mongoose = require('mongoose');
const config = require('../config');
const logger = require('../core/utils/logger');

/**
 * Establishes MongoDB connection with production-grade pool settings.
 * Designed for horizontal scaling with connection pooling (50+ connections).
 */
const connectDatabase = async () => {
  try {
    await mongoose.connect(config.mongodb.uri, {
      maxPoolSize: config.mongodb.maxPoolSize,
      minPoolSize: config.isProduction ? 2 : 0,
      maxIdleTimeMS: 30000,
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
      // Fail fast instead of buffering ops while disconnected (reduces hung first requests).
      bufferCommands: false,
    });

    logger.info('MongoDB connected');

    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });
  } catch (error) {
    logger.error('MongoDB connection failed:', error);
    process.exit(1);
  }
};

const disconnectDatabase = async () => {
  await mongoose.disconnect();
};

module.exports = { connectDatabase, disconnectDatabase };

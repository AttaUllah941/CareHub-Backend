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
    if (error.code === 'ENOTFOUND' || error.syscall === 'querySrv') {
      logger.error(
        'Hint: the MongoDB host in MONGODB_URI does not resolve. Copy the current connection string from Atlas (Connect → Drivers) into the MONGODB_URI environment variable.',
      );
    } else if (/auth/i.test(error.message)) {
      logger.error('Hint: MongoDB rejected the credentials. Check the database user/password in MONGODB_URI.');
    } else if (error.name === 'MongooseServerSelectionError') {
      logger.error('Hint: could not reach MongoDB. In Atlas → Network Access allow 0.0.0.0/0 (Render uses changing IPs).');
    }
    process.exit(1);
  }
};

const disconnectDatabase = async () => {
  await mongoose.disconnect();
};

module.exports = { connectDatabase, disconnectDatabase };

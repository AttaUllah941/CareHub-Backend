const http = require('http');
const createApp = require('./app');
const config = require('./config');
const { connectDatabase } = require('./config/database');
const { connectRedis, disconnectRedis } = require('./config/redis');
const { initEmailQueue, closeEmailQueue } = require('./jobs/queues/email.queue');
const { startEmailProcessor } = require('./jobs/processors/email.processor');
const { initSockets, closeSockets } = require('./sockets');
const logger = require('./core/utils/logger');

/**
 * Application entry point.
 * Connects to MongoDB, Redis, and starts the HTTP server with Bull email workers.
 */
const startServer = async () => {
  await connectDatabase();
  const redisClient = await connectRedis();

  const emailQueue = await initEmailQueue(redisClient);
  if (emailQueue) {
    startEmailProcessor(emailQueue);
  }

  const app = createApp();
  const httpServer = http.createServer(app);

  initSockets(httpServer);

  httpServer.listen(config.port, () => {
    logger.info(`CareHub API listening on port ${config.port}`);
    logger.info(`Health check: http://localhost:${config.port}/health`);
    logger.info(`API base URL: http://localhost:${config.port}${config.apiPrefix}`);
    logger.info(`Swagger docs: http://localhost:${config.port}${config.apiPrefix}/docs`);
    logger.info(`Video consult signaling: ws://localhost:${config.port}/video-consult`);
  });

  const gracefulShutdown = async () => {
    httpServer.close(async () => {
      await closeSockets();
      await closeEmailQueue();
      await disconnectRedis();
      process.exit(0);
    });
  };

  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);
};

startServer().catch((err) => {
  logger.error('Failed to start server:', err);
  process.exit(1);
});

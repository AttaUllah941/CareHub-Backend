const http = require('http');
const createApp = require('./app');
const config = require('./config');
const { connectDatabase } = require('./config/database');
const logger = require('./core/utils/logger');

/**
 * Application entry point.
 * Connects to MongoDB and starts the HTTP server.
 */
const startServer = async () => {
  await connectDatabase();

  const app = createApp();
  const httpServer = http.createServer(app);

  httpServer.listen(config.port, () => {
    logger.info(`CareHub API listening on port ${config.port}`);
    logger.info(`Health check: http://localhost:${config.port}/health`);
    logger.info(`API base URL: http://localhost:${config.port}${config.apiPrefix}`);
    logger.info(`Swagger docs: http://localhost:${config.port}${config.apiPrefix}/docs`);
  });

  const gracefulShutdown = () => {
    httpServer.close(() => {
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

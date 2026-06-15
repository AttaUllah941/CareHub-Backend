const http = require('http');
const createApp = require('./app');
const config = require('./config');
const { connectDatabase } = require('./config/database');
const { connectRedis } = require('./config/redis');
const { initializeSocket } = require('./config/socket');
const { seedRolesAndPermissions } = require('./features/roles/seeds');
const { seedMedicalSpecialties } = require('./features/medical-specialties/seeds');
const { seedLanguages } = require('./features/languages/seeds');
const { seedClinics } = require('./features/clinics/seeds');
const container = require('./core/container');
const logger = require('./core/utils/logger');

/**
 * Application entry point.
 * Bootstraps database, cache, HTTP server, and WebSocket layer.
 */
const startServer = async () => {
  await connectDatabase();
  await seedRolesAndPermissions();
  await seedMedicalSpecialties();
  await seedLanguages();
  await seedClinics();

  const redis = connectRedis();
  try {
    await redis.connect();
  } catch {
    logger.warn('Redis unavailable — running without cache (dev mode)');
  }

  const app = createApp();
  const httpServer = http.createServer(app);

  initializeSocket(httpServer);

  const notificationReminderService = container.resolve('notificationReminderService');
  notificationReminderService.start();

  httpServer.listen(config.port, () => {
    logger.info(`CareHub API running on port ${config.port}`);
    logger.info(`Swagger docs: http://localhost:${config.port}${config.apiPrefix}/docs`);
    logger.info(`Environment: ${config.env}`);
  });

  const gracefulShutdown = async (signal) => {
    logger.info(`${signal} received. Shutting down gracefully...`);
    httpServer.close(() => {
      logger.info('HTTP server closed');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
};

startServer().catch((err) => {
  logger.error('Failed to start server:', err);
  process.exit(1);
});

const http = require('http');
const createApp = require('./app');
const config = require('./config');
const { connectDatabase } = require('./config/database');
const { initializeSocket } = require('./config/socket');
const { seedRolesAndPermissions } = require('./features/roles/seeds');
const { seedMedicalSpecialties } = require('./features/medical-specialties/seeds');
const { seedLanguages } = require('./features/languages/seeds');
const { seedClinics } = require('./features/clinics/seeds');
const container = require('./core/container');
const logger = require('./core/utils/logger');

/**
 * Application entry point.
 * Bootstraps database, HTTP server, and WebSocket layer.
 */
const startServer = async () => {
  await connectDatabase();
  await seedRolesAndPermissions();
  await seedMedicalSpecialties();
  await seedLanguages();
  await seedClinics();

  const app = createApp();
  const httpServer = http.createServer(app);

  initializeSocket(httpServer);

  const notificationReminderService = container.resolve('notificationReminderService');
  notificationReminderService.start();

  httpServer.listen(config.port);

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

const http = require('http');
const app = require('./app');
const config = require('./config');
const { connectDatabase } = require('./config/database');

const startServer = async () => {
  await connectDatabase();

  const server = http.createServer(app);

  server.listen(config.PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`CareHub API listening on port ${config.PORT}`);
    // eslint-disable-next-line no-console
    console.log(`Health: http://localhost:${config.PORT}${config.apiPrefix}/health`);
  });

  const shutdown = () => {
    server.close(() => process.exit(0));
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
};

startServer().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start server:', err);
  process.exit(1);
});

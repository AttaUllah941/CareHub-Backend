const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const config = require('./config');
const swaggerSpec = require('./config/swagger');
const apiRoutes = require('./routes');
const { errorHandler, notFoundHandler } = require('./core/errors/errorHandler');
const { globalRateLimiter } = require('./core/middleware/rateLimiter.middleware');

/**
 * Creates and configures the Express application.
 * Feature modules are mounted via src/routes/index.js.
 */
const createApp = () => {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: config.cors.origin, credentials: true, optionsSuccessStatus: 204 }));
  app.use(globalRateLimiter);
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  if (!config.isProduction) {
    app.use(morgan('dev'));
  }

  app.get('/health', (_req, res) => {
    res.status(200).json({
      success: true,
      message: 'CareHub API is running',
      data: {
        environment: config.env,
        apiPrefix: config.apiPrefix,
        timestamp: new Date().toISOString(),
      },
    });
  });

  app.use(`${config.apiPrefix}/docs`, swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.use(config.apiPrefix, apiRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};

module.exports = createApp;

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const config = require('./config');
const swaggerSpec = require('./config/swagger');
const apiRoutes = require('./routes');
const { ensureUploadDir, resolveUploadDir } = require('./shared/utils/storage');
const { errorHandler, notFoundHandler } = require('./core/errors/errorHandler');
const {
  globalRateLimiter,
  writeLimiter,
} = require('./shared/middleware/rateLimit.middleware');

const applyWriteRateLimiter = (req, res, next) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return writeLimiter(req, res, next);
  }
  return next();
};

/**
 * Creates and configures the Express application.
 * Feature modules are mounted via src/routes/index.js.
 */
const createApp = () => {
  const app = express();

  // Render / reverse proxies — required for correct client IPs & rate limiting
  if (config.isProduction) {
    app.set('trust proxy', 1);
  }

  ensureUploadDir().catch(() => {});

  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));
  app.use(cors({ origin: config.cors.origin, credentials: true, optionsSuccessStatus: 204 }));
  app.use(globalRateLimiter);
  app.use(applyWriteRateLimiter);
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use('/uploads', express.static(resolveUploadDir()));

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

const winston = require('winston');
const config = require('../../config');

/**
 * Structured logger for production observability.
 * JSON format in production, colorized console in development.
 */
const logger = winston.createLogger({
  level: config.isProduction ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    config.isProduction
      ? winston.format.json()
      : winston.format.combine(winston.format.colorize(), winston.format.simple()),
  ),
  transports: [new winston.transports.Console()],
});

module.exports = logger;

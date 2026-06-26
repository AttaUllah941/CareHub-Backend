const config = require('../../config');
const AppError = require('../errors/AppError');
const { errorResponse } = require('../utils/apiResponse');

/**
 * Global error handler — must be registered last in Express.
 */
// eslint-disable-next-line no-unused-vars
const errorMiddleware = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let errors = err.errors;

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    const value = err.keyValue?.[field];
    statusCode = 409;
    message = `${field} already exists`;
    if (!config.isProduction && value !== undefined) {
      // eslint-disable-next-line no-console
      console.error('Duplicate key:', field, value);
    }
  }

  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  }

  if (!(err instanceof AppError) && !err.isOperational) {
    if (config.isProduction) {
      message = 'Internal server error';
    }
    statusCode = statusCode < 500 ? statusCode : 500;
  }

  if (!config.isProduction && !(err instanceof AppError) && !err.isOperational) {
    // eslint-disable-next-line no-console
    console.error(err);
  }

  res.status(statusCode).json(errorResponse(message, errors));
};

module.exports = errorMiddleware;

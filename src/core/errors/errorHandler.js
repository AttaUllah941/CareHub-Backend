const { ValidationError, NotFoundError } = require('./AppError');
const { HttpStatus } = require('../../shared/constants/httpStatus.constants');
const logger = require('../utils/logger');
const config = require('../../config');

/**
 * Maps Mongoose/MongoDB errors to operational AppErrors.
 */
const handleCastError = (err) => new ValidationError(`Invalid ${err.path}: ${err.value}`);

const handleDuplicateKeyError = (err) => {
  const field = Object.keys(err.keyValue)[0];
  return new ValidationError(`${field} already exists`);
};

const handleValidationError = (err) => {
  const errors = Object.values(err.errors).map((e) => ({
    field: e.path,
    message: e.message,
  }));
  return new ValidationError('Validation failed', errors);
};

const handleJWTError = () => new ValidationError('Invalid token. Please log in again.');

const handleJWTExpiredError = () => new ValidationError('Token expired. Please log in again.');

/**
 * Global error handling middleware.
 * Sends consistent JSON error responses across all endpoints.
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, _next) => {
  let error = { ...err, message: err.message, statusCode: err.statusCode };

  if (err.name === 'CastError') error = handleCastError(err);
  if (err.code === 11000) error = handleDuplicateKeyError(err);
  if (err.name === 'ValidationError' && err.errors) error = handleValidationError(err);
  if (err.name === 'JsonWebTokenError') error = handleJWTError();
  if (err.name === 'TokenExpiredError') error = handleJWTExpiredError();

  const statusCode = error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR;
  const message = error.message || 'Internal server error';

  if (!error.isOperational) {
    logger.error('Unexpected error:', err);
  }

  const response = {
    success: false,
    message,
    ...(error.errors && { errors: error.errors }),
    ...(config.env === 'development' && { stack: err.stack }),
  };

  res.status(statusCode).json(response);
};

/**
 * Catches 404 for undefined routes.
 */
const notFoundHandler = (req, res, next) => {
  next(new NotFoundError(`Route ${req.originalUrl} not found`));
};

module.exports = { errorHandler, notFoundHandler };

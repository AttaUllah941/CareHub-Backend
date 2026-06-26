/**
 * Operational application error with HTTP status mapping.
 */
class AppError extends Error {
  /**
   * @param {string} message
   * @param {number} statusCode
   * @param {boolean} isOperational
   * @param {Array<{ field: string, message: string }>} [errors]
   */
  constructor(message, statusCode = 500, isOperational = true, errors = undefined) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.errors = errors;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;

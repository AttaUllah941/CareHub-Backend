const { HttpStatus } = require('../../shared/constants/httpStatus.constants');

/**
 * Standard success envelope — matches the CareHub Angular frontend contract.
 */
const successResponse = (res, data, message = 'Success', statusCode = HttpStatus.OK) => {
  res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

/**
 * Message-only success response (logout, password reset acknowledgement, etc.).
 */
const messageResponse = (res, message, statusCode = HttpStatus.OK) => {
  res.status(statusCode).json({
    success: true,
    message,
  });
};

module.exports = { successResponse, messageResponse };

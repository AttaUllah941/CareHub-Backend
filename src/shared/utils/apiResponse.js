/**
 * Standard success envelope for API responses.
 */
const successResponse = (data = null, message = 'Success') => ({
  success: true,
  message,
  ...(data !== null && data !== undefined ? { data } : {}),
});

/**
 * Standard error envelope for API responses.
 */
const errorResponse = (message = 'An error occurred', errors = undefined) => ({
  success: false,
  message,
  ...(errors ? { errors } : {}),
});

module.exports = { successResponse, errorResponse };

/**
 * The codebase has two AppError classes (core/errors and shared/errors) that are not related by
 * inheritance. Both mark business-rule failures with `isOperational` and a numeric `statusCode`,
 * so the AI layer detects them structurally instead of with instanceof.
 */
const isOperationalError = (error) =>
  Boolean(error) && error.isOperational === true && Number.isInteger(error.statusCode);

module.exports = { isOperationalError };

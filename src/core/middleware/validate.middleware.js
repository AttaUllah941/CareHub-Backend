const { validationResult } = require('express-validator');
const { ValidationError } = require('../errors/AppError');

/**
 * Middleware that validates request body/query/params against DTO rules.
 * Returns structured 422 errors when validation fails.
 */
const validate = (req, _res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((err) => ({
      field: err.path,
      message: err.msg,
    }));
    return next(new ValidationError('Validation failed', formattedErrors));
  }

  next();
};

module.exports = validate;

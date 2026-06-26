const AppError = require('../errors/AppError');

/**
 * Validates request body against a Zod schema.
 */
const validateBody = (schema) => (req, _res, next) => {
  const result = schema.safeParse(req.body);

  if (!result.success) {
    const errors = result.error.errors.map((issue) => ({
      field: issue.path.join('.') || 'body',
      message: issue.message,
    }));
    return next(new AppError('Validation failed', 422, true, errors));
  }

  req.body = result.data;
  return next();
};

module.exports = { validateBody };

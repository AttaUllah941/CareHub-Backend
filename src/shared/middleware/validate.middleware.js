const { ValidationError } = require('../../core/errors/AppError');

const formatZodErrors = (zodError) =>
  zodError.errors.map((error) => ({
    field: error.path.join('.') || 'root',
    message: error.message,
  }));

/**
 * Zod validation middleware factory.
 * @param {import('zod').ZodTypeAny} schema
 * @param {'body'|'query'|'params'} source
 */
const validate =
  (schema, source = 'body') =>
  (req, _res, next) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      return next(new ValidationError('Validation failed', formatZodErrors(result.error)));
    }

    req[source] = result.data;
    return next();
  };

/**
 * Validates multiple request sources in one middleware.
 * @param {{ body?: import('zod').ZodTypeAny, query?: import('zod').ZodTypeAny, params?: import('zod').ZodTypeAny }} schemas
 */
const validateRequest =
  (schemas) =>
  (req, _res, next) => {
    const errors = [];

    for (const source of ['body', 'query', 'params']) {
      const schema = schemas[source];
      if (!schema) continue;

      const result = schema.safeParse(req[source]);
      if (!result.success) {
        errors.push(...formatZodErrors(result.error));
      } else {
        req[source] = result.data;
      }
    }

    if (errors.length > 0) {
      return next(new ValidationError('Validation failed', errors));
    }

    return next();
  };

module.exports = {
  validate,
  validateRequest,
};

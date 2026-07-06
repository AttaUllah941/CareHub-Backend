const AppError = require('../errors/AppError');

/**
 * Role-based access control factory.
 * @param {...string} allowedRoles
 */
const authorize = (...allowedRoles) => (req, _res, next) => {
  if (!req.user) {
    return next(new AppError('Authentication required', 401));
  }

  if (!allowedRoles.includes(req.user.role)) {
    return next(new AppError('Insufficient permissions', 403));
  }

  return next();
};

module.exports = { authorize };

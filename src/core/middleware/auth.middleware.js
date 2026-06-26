const { UnauthorizedError, ForbiddenError } = require('../errors/AppError');
const { verifyAccessToken } = require('../utils/token.utils');

/**
 * JWT authentication middleware.
 * Validates Bearer token and attaches decoded user to req.user.
 */
const authenticate = async (req, _res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      return next(new UnauthorizedError('Access token required'));
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);

    req.user = { id: decoded.sub, role: decoded.role };
    next();
  } catch {
    next(new UnauthorizedError('Invalid or expired token'));
  }
};

/**
 * Optional JWT authentication — attaches req.user when a valid Bearer token is present.
 */
const optionalAuthenticate = async (req, _res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return next();
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);
    req.user = { id: decoded.sub, role: decoded.role };
  } catch {
    // Ignore invalid tokens for optional auth routes
  }

  next();
};

/**
 * Role-based access control middleware factory.
 * @param {...string} allowedRoles - Roles permitted to access the route
 */
const authorize = (...allowedRoles) => (req, _res, next) => {
  if (!req.user) {
    return next(new UnauthorizedError('Authentication required'));
  }

  if (!allowedRoles.includes(req.user.role)) {
    return next(new ForbiddenError('Insufficient permissions'));
  }

  next();
};

module.exports = { authenticate, optionalAuthenticate, authorize };

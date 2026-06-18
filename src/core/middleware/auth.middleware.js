const { UnauthorizedError, ForbiddenError } = require('../errors/AppError');
const { verifyAccessToken } = require('../utils/token.utils');
const container = require('../container');

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

/**
 * Permission-based access control middleware.
 * Checks if the user's role has the required permission slug.
 */
const authorizePermission = (permissionSlug) => async (req, _res, next) => {
  if (!req.user) {
    return next(new UnauthorizedError('Authentication required'));
  }

  if (req.user.role === 'SUPER_ADMIN') return next();

  try {
    const roleRepository = container.resolve('roleRepository');
    const role = await roleRepository.findBySlug(req.user.role);
    if (!role || !role.isActive) {
      return next(new ForbiddenError('Insufficient permissions'));
    }

    const hasPermission = role.permissions.some(
      (p) => p.slug === permissionSlug || p.slug === '*',
    );
    if (!hasPermission) {
      return next(new ForbiddenError('Insufficient permissions'));
    }
    next();
  } catch {
    next(new ForbiddenError('Insufficient permissions'));
  }
};

module.exports = { authenticate, authorize, authorizePermission };

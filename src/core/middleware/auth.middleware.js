const { UnauthorizedError, ForbiddenError } = require('../errors/AppError');
const { verifyAccessToken } = require('../utils/token.utils');
const { createMemoryCache } = require('../../shared/utils/memoryCache');
const { User } = require('../../modules/users/users.model');

/**
 * Short-lived cache of "is this account still active?" so a deactivated user is
 * locked out within seconds without adding a DB round-trip to every request.
 */
const ACTIVE_STATUS_TTL_MS = 30 * 1000;
const activeStatusCache = createMemoryCache({ defaultTtlMs: ACTIVE_STATUS_TTL_MS, maxEntries: 20000 });

const invalidateAuthCache = (userId) => {
  if (userId) activeStatusCache.del(String(userId));
};

const isAccountActive = (userId) =>
  activeStatusCache.wrap(String(userId), async () => {
    const user = await User.findById(userId).select('isActive').lean();
    return Boolean(user?.isActive);
  });

const extractBearerToken = (req) => {
  const authHeader = req.headers.authorization;
  return authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
};

/**
 * JWT authentication middleware.
 * Validates Bearer token, confirms the account is still active, and attaches
 * the decoded user to req.user.
 */
const authenticate = async (req, _res, next) => {
  const token = extractBearerToken(req);
  if (!token) {
    return next(new UnauthorizedError('Access token required'));
  }

  let decoded;
  try {
    decoded = verifyAccessToken(token);
  } catch {
    return next(new UnauthorizedError('Invalid or expired token'));
  }

  try {
    if (!(await isAccountActive(decoded.sub))) {
      return next(new UnauthorizedError('Account is inactive or no longer exists'));
    }
  } catch (error) {
    return next(error);
  }

  req.user = { id: decoded.sub, role: decoded.role };
  return next();
};

/**
 * Optional JWT authentication — attaches req.user when a valid Bearer token
 * for an active account is present; otherwise continues as a guest.
 */
const optionalAuthenticate = async (req, _res, next) => {
  const token = extractBearerToken(req);
  if (!token) {
    return next();
  }

  try {
    const decoded = verifyAccessToken(token);
    if (await isAccountActive(decoded.sub)) {
      req.user = { id: decoded.sub, role: decoded.role };
    }
  } catch {
    // Ignore invalid tokens for optional auth routes
  }

  return next();
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

module.exports = { authenticate, optionalAuthenticate, authorize, invalidateAuthCache };

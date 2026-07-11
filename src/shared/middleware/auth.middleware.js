const { UnauthorizedError } = require('../../core/errors/AppError');
const { verifyAccessToken } = require('../../core/utils/token.utils');

/**
 * Verifies Bearer access token and attaches req.user = { id, role }.
 * Uses the same JWT config as the core auth module.
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
    return next();
  } catch {
    return next(new UnauthorizedError('Invalid or expired token'));
  }
};

/**
 * Optionally attaches req.user when a valid Bearer token is present.
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

  return next();
};

module.exports = { authenticate, optionalAuthenticate };

const jwt = require('jsonwebtoken');
const config = require('../../config');
const AppError = require('../errors/AppError');
const asyncHandler = require('../utils/asyncHandler');

const attachUserFromToken = (token) => {
  const decoded = jwt.verify(token, config.JWT_ACCESS_SECRET);
  return { id: decoded.sub, role: decoded.role };
};

/**
 * Verifies Bearer access token and attaches req.user = { id, role }.
 */
const authenticate = asyncHandler(async (req, _res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    throw new AppError('Access token required', 401);
  }

  const token = authHeader.split(' ')[1];

  try {
    req.user = attachUserFromToken(token);
    next();
  } catch {
    throw new AppError('Invalid or expired token', 401);
  }
});

/**
 * Optionally attaches req.user when a valid Bearer token is present.
 */
const optionalAuthenticate = asyncHandler(async (req, _res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split(' ')[1];

  try {
    req.user = attachUserFromToken(token);
    next();
  } catch {
    throw new AppError('Invalid or expired token', 401);
  }
});

module.exports = { authenticate, optionalAuthenticate };

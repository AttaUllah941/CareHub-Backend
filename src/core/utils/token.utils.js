const jwt = require('jsonwebtoken');
const config = require('../../config');

/**
 * Generates access and refresh JWT tokens for authenticated sessions.
 */
const generateTokens = (userId, role) => {
  const payload = { sub: userId, role };

  const accessToken = jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });

  const refreshToken = jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn,
  });

  return { accessToken, refreshToken };
};

/**
 * Verifies an access token and returns decoded payload.
 */
const verifyAccessToken = (token) => jwt.verify(token, config.jwt.secret);

/**
 * Verifies a refresh token and returns decoded payload.
 */
const verifyRefreshToken = (token) => jwt.verify(token, config.jwt.refreshSecret);

module.exports = { generateTokens, verifyAccessToken, verifyRefreshToken };

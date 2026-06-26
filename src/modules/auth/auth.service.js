const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../../config');
const AppError = require('../../shared/errors/AppError');
const { hashToken, generateSecureToken } = require('../../shared/utils/crypto.util');
const { toUserResponse } = require('../../shared/utils/user.mapper');
const authRepository = require('./auth.repository');

const parseDurationToMs = (value) => {
  const match = /^(\d+)([smhd])$/.exec(value);
  if (!match) {
    return 7 * 24 * 60 * 60 * 1000;
  }

  const amount = Number(match[1]);
  const unit = match[2];

  const multipliers = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return amount * multipliers[unit];
};

const hashPassword = async (password) => bcrypt.hash(password, config.BCRYPT_SALT_ROUNDS);

const comparePassword = async (password, passwordHash) => bcrypt.compare(password, passwordHash);

const signAccessToken = (user) =>
  jwt.sign({ sub: user._id.toString(), role: user.role }, config.JWT_ACCESS_SECRET, {
    expiresIn: config.JWT_ACCESS_EXPIRES_IN,
  });

const createRefreshTokenValue = () => generateSecureToken(48);

const storeRefreshToken = async (userId, refreshToken) => {
  const expiresAt = new Date(Date.now() + parseDurationToMs(config.JWT_REFRESH_EXPIRES_IN));

  await authRepository.createRefreshToken({
    userId,
    tokenHash: hashToken(refreshToken),
    expiresAt,
    revoked: false,
  });
};

const buildAuthResponse = async (user) => {
  await authRepository.revokeAllRefreshTokensForUser(user._id);

  const accessToken = signAccessToken(user);
  const refreshToken = createRefreshTokenValue();

  await storeRefreshToken(user._id, refreshToken);

  return {
    user: toUserResponse(user),
    accessToken,
    refreshToken,
  };
};

const register = async (payload) => {
  const existingEmail = await authRepository.findUserByEmail(payload.email);
  if (existingEmail) {
    throw new AppError('Email already exists', 409);
  }

  const passwordHash = await hashPassword(payload.password);

  const user = await authRepository.createUser({
    firstName: payload.firstName,
    lastName: payload.lastName,
    email: payload.email.toLowerCase(),
    phone: payload.phone,
    passwordHash,
    role: payload.role || 'PATIENT',
  });

  return buildAuthResponse(user);
};

const login = async ({ email, password }) => {
  const user = await authRepository.findUserByEmail(email, { includePassword: true });

  if (!user || !user.isActive) {
    throw new AppError('Invalid email or password', 401);
  }

  const isValid = await comparePassword(password, user.passwordHash);
  if (!isValid) {
    throw new AppError('Invalid email or password', 401);
  }

  user.passwordHash = undefined;
  return buildAuthResponse(user);
};

const refresh = async ({ refreshToken }) => {
  const storedToken = await authRepository.findRefreshTokenByHash(hashToken(refreshToken));

  if (!storedToken || storedToken.expiresAt <= new Date()) {
    throw new AppError('Invalid or expired refresh token', 401);
  }

  const user = await authRepository.findUserById(storedToken.userId);
  if (!user || !user.isActive) {
    throw new AppError('User account is inactive', 401);
  }

  await authRepository.revokeRefreshTokenById(storedToken._id);

  return buildAuthResponse(user);
};

const logout = async (userId) => {
  await authRepository.revokeAllRefreshTokensForUser(userId);
};

const getProfile = async (userId) => {
  const user = await authRepository.findUserById(userId);

  if (!user || !user.isActive) {
    throw new AppError('User not found', 404);
  }

  return { user: toUserResponse(user) };
};

const forgotPassword = async ({ email }) => {
  const genericMessage =
    'If an account exists for that email, a password reset link has been sent.';

  const user = await authRepository.findUserByEmail(email);

  if (!user) {
    return { message: genericMessage };
  }

  const resetToken = generateSecureToken(32);
  const expiresAt = new Date(Date.now() + config.PASSWORD_RESET_EXPIRES_MS);

  await authRepository.createPasswordResetToken({
    userId: user._id,
    tokenHash: hashToken(resetToken),
    expiresAt,
    used: false,
  });

  const resetUrl = `${config.FRONTEND_URL || 'http://localhost:4200'}/auth/reset-password?token=${resetToken}`;

  // eslint-disable-next-line no-console
  console.log('[auth] Password reset email stub:', {
    to: user.email,
    resetUrl,
    expiresAt: expiresAt.toISOString(),
  });

  const response = { message: genericMessage };

  if (!config.isProduction) {
    response.devResetToken = resetToken;
  }

  return response;
};

const resetPassword = async ({ token, password }) => {
  const storedToken = await authRepository.findValidPasswordResetToken(hashToken(token));

  if (!storedToken) {
    throw new AppError('Invalid or expired reset token', 400);
  }

  const passwordHash = await hashPassword(password);
  await authRepository.updateUserPassword(storedToken.userId, passwordHash);
  await authRepository.markPasswordResetTokenUsed(storedToken._id);
  await authRepository.revokeAllRefreshTokensForUser(storedToken.userId);

  return { message: 'Password reset successful' };
};

const changePassword = async (userId, { currentPassword, newPassword }) => {
  const user = await authRepository.findUserById(userId, { includePassword: true });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  const isValid = await comparePassword(currentPassword, user.passwordHash);
  if (!isValid) {
    throw new AppError('Current password is incorrect', 400);
  }

  const passwordHash = await hashPassword(newPassword);
  await authRepository.updateUserPassword(userId, passwordHash);
  await authRepository.revokeAllRefreshTokensForUser(userId);

  return { message: 'Password changed successfully' };
};

module.exports = {
  register,
  login,
  refresh,
  logout,
  getProfile,
  forgotPassword,
  resetPassword,
  changePassword,
};

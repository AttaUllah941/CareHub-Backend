const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const {
  BadRequestError,
  ConflictError,
  NotFoundError,
  UnauthorizedError,
} = require('../../core/errors/AppError');
const config = require('../../config');
const { generateTokens, verifyRefreshToken } = require('../../core/utils/token.utils');
const { PUBLIC_REGISTRATION_ROLES, UserRole } = require('../../shared/enums/userRole.enum');
const usersRepository = require('../users/users.repository');
const doctorApplicationsRepository = require('../doctor-applications/doctor-applications.repository');
const authRepository = require('./auth.repository');
const { hashToken } = require('./auth.model');
const {
  sendRegistrationEmail,
  sendPasswordResetEmail,
} = require('../../shared/services/eventNotifications.service');

const toUserResponse = (user) => ({
  id: user._id.toString(),
  firstName: user.firstName,
  lastName: user.lastName,
  email: user.email,
  phone: user.phone || null,
  role: user.role,
  isActive: user.isActive,
  isEmailVerified: user.isEmailVerified,
  createdAt: user.createdAt?.toISOString(),
});

const register = async (payload) => {
  const email = payload.email.toLowerCase();

  if (!PUBLIC_REGISTRATION_ROLES.includes(payload.role)) {
    throw new BadRequestError('Invalid registration role');
  }

  const existingUser = await usersRepository.findByEmail(email);
  if (existingUser) {
    throw new ConflictError('An account with this email already exists');
  }

  const passwordHash = await bcrypt.hash(payload.password, config.bcrypt.saltRounds);

  const user = await usersRepository.create({
    firstName: payload.firstName,
    lastName: payload.lastName,
    email,
    phone: payload.phone,
    passwordHash,
    role: payload.role,
    isActive: true,
    isEmailVerified: false,
  });

  await sendRegistrationEmail({
    email: user.email,
    firstName: user.firstName,
  });

  const tokens = generateTokens(user._id.toString(), user.role);

  return {
    user: toUserResponse(user),
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  };
};

const resolveInactiveAccountError = async (user) => {
  if (user.role !== UserRole.DOCTOR) {
    return new UnauthorizedError('Account is inactive');
  }

  const application = await doctorApplicationsRepository.findByEmail(user.email);
  if (application?.status === 'pending') {
    return new UnauthorizedError(
      'Your doctor application is pending admin approval. You can sign in after it is approved.',
    );
  }

  if (application?.status === 'rejected') {
    const reason = application.rejectionReason?.trim();
    return new UnauthorizedError(
      reason
        ? `Your doctor application was not approved. Reason: ${reason}`
        : 'Your doctor application was not approved.',
    );
  }

  return new UnauthorizedError('Account is inactive');
};

const login = async ({ email, password }) => {
  const user = await usersRepository.findByEmail(email.toLowerCase());
  if (!user) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) {
    throw new UnauthorizedError('Invalid email or password');
  }

  if (!user.isActive) {
    throw await resolveInactiveAccountError(user);
  }

  return buildAuthResponse(user);
};

const refresh = async ({ refreshToken }) => {
  if (!refreshToken) {
    throw new UnauthorizedError('Refresh token is required');
  }

  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch {
    throw new UnauthorizedError('Invalid or expired refresh token');
  }

  const user = await usersRepository.findById(decoded.sub);
  if (!user) {
    throw new UnauthorizedError('Invalid or expired refresh token');
  }

  if (!user.isActive) {
    throw new UnauthorizedError('Account is inactive');
  }

  return buildAuthResponse(user);
};

const buildAuthResponse = (user) => {
  const tokens = generateTokens(user._id.toString(), user.role);

  return {
    user: toUserResponse(user),
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  };
};

const getMe = async (userId) => {
  const user = await usersRepository.findById(userId);
  if (!user) {
    throw new NotFoundError('User not found');
  }

  return { user: toUserResponse(user) };
};

const requestPasswordReset = async (email) => {
  const user = await usersRepository.findByEmail(email.toLowerCase());

  if (!user) {
    return { message: 'If an account exists for that email, a reset link has been sent' };
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + config.passwordReset.expiresInMs);

  await authRepository.invalidateUserPasswordResetTokens(user._id);
  await authRepository.createPasswordResetToken({
    userId: user._id,
    tokenHash: hashToken(resetToken),
    expiresAt,
  });

  await sendPasswordResetEmail({
    email: user.email,
    firstName: user.firstName,
    resetToken,
  });

  return { message: 'If an account exists for that email, a reset link has been sent' };
};

const resetPassword = async ({ token, password }) => {
  const resetRecord = await authRepository.findValidPasswordResetToken(token);
  if (!resetRecord) {
    throw new BadRequestError('Invalid or expired password reset token');
  }

  const passwordHash = await bcrypt.hash(password, config.bcrypt.saltRounds);

  await usersRepository.updateById(resetRecord.userId, { passwordHash });
  await authRepository.markPasswordResetTokenUsed(resetRecord._id);

  return { message: 'Password has been reset successfully' };
};

const refreshSession = async (refreshToken) => {
  if (!refreshToken) {
    throw new BadRequestError('Refresh token is required');
  }

  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch {
    throw new UnauthorizedError('Invalid or expired refresh token');
  }

  const user = await usersRepository.findById(decoded.sub);
  if (!user || !user.isActive) {
    throw new UnauthorizedError('Account is inactive or no longer exists');
  }

  const tokens = generateTokens(user._id.toString(), user.role);

  return {
    user: toUserResponse(user),
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  };
};

const logout = async () => ({ message: 'Logged out successfully' });

const changePassword = async (userId, { currentPassword, newPassword }) => {
  const user = await usersRepository.findById(userId);
  if (!user) {
    throw new NotFoundError('User not found');
  }

  const passwordMatches = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!passwordMatches) {
    throw new UnauthorizedError('Current password is incorrect');
  }

  const passwordHash = await bcrypt.hash(newPassword, config.bcrypt.saltRounds);
  await usersRepository.updateById(userId, { passwordHash });

  return { message: 'Password changed successfully' };
};

module.exports = {
  register,
  login,
  refresh,
  getMe,
  requestPasswordReset,
  resetPassword,
  refreshSession,
  logout,
  changePassword,
  toUserResponse,
  buildAuthResponse,
};

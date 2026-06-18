const bcrypt = require('bcryptjs');
const {
  ConflictError,
  UnauthorizedError,
  NotFoundError,
  ForbiddenError,
  BadRequestError,
} = require('../../../core/errors/AppError');
const { generateTokens, verifyRefreshToken } = require('../../../core/utils/token.utils');
const { generatePasswordResetToken } = require('../../../core/utils/crypto.utils');
const { sendPasswordResetEmail } = require('../../../core/utils/email.utils');
const config = require('../../../config');
const {
  UserRole,
  SELF_REGISTER_ROLES,
  ADMIN_ONLY_ROLES,
} = require('../../../shared/enums/userRole.enum');
const { AuditAction } = require('../../../shared/enums/auditAction.enum');

/**
 * Auth Service — business logic for authentication and session management.
 * Single Responsibility: handles registration, login, token refresh, and logout.
 */
class AuthService {
  /**
   * @param {import('../repositories/user.repository')} userRepository
   */
  constructor(userRepository, auditService) {
    this.userRepository = userRepository;
    this.auditService = auditService;
  }

  /**
   * Register a new user with role validation.
   */
  async register(userData, requestedBy = null) {
    const { email, phone, role } = userData;

    this._validateRegistrationRole(role, requestedBy);

    const [existingEmail, existingPhone] = await Promise.all([
      this.userRepository.findByEmail(email),
      this.userRepository.findByPhone(phone),
    ]);

    if (existingEmail) throw new ConflictError('Email already registered');
    if (existingPhone) throw new ConflictError('Phone number already registered');

    const user = await this.userRepository.create(userData); // Create a new user. 
    const tokens = await this._issueTokens(user);

    await this.auditService.log({
      action: AuditAction.CREATE,
      module: 'auth',
      entityType: 'user',
      entityId: user._id,
      entityLabel: user.email,
      description: 'User registered',
      requestedBy: requestedBy || { id: user._id.toString(), email: user.email, role: user.role },
      metadata: { role: user.role },
    });

    return { user: user.toJSON(), ...tokens };
  }

  /**
   * Authenticate user credentials and issue tokens.
   */
  async login(email, password, context = {}) {
    const { ipAddress, userAgent } = context;

    const user = await this.userRepository.findByEmailWithPassword(email);

    if (!user) {
      await this._auditLoginFailed(email, 'Invalid email or password', context);
      throw new UnauthorizedError('Invalid email or password');
    }
    if (!user.isActive) {
      await this._auditLoginFailed(email, 'Account is deactivated', context);
      throw new ForbiddenError('Account is deactivated');
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      await this._auditLoginFailed(email, 'Invalid email or password', context);
      throw new UnauthorizedError('Invalid email or password');
    }

    await this.userRepository.updateById(user._id, { lastLoginAt: new Date() });

    const tokens = await this._issueTokens(user);
    const sanitizedUser = await this.userRepository.findById(user._id);

    await this.auditService.log({
      action: AuditAction.LOGIN,
      module: 'auth',
      entityType: 'user',
      entityId: user._id,
      entityLabel: user.email,
      description: 'User logged in successfully',
      requestedBy: { id: user._id.toString(), email: user.email, role: user.role },
      ipAddress,
      userAgent,
    });

    return { user: sanitizedUser.toJSON(), ...tokens };
  }

  /**
   * Refresh access token using a valid refresh token.
   */
  async refreshToken(refreshToken) {
    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    const user = await this.userRepository.findByIdWithPassword(decoded.sub);
    if (!user || !user.isActive) throw new UnauthorizedError('User not found or inactive');

    const isTokenValid = await bcrypt.compare(refreshToken, user.refreshToken || '');
    if (!isTokenValid) throw new UnauthorizedError('Refresh token revoked');

    const tokens = await this._issueTokens(user);
    const sanitizedUser = await this.userRepository.findById(user._id);

    return { user: sanitizedUser.toJSON(), ...tokens };
  }

  /**
   * Logout — clear refresh token so new access tokens cannot be issued.
   */
  async logout(userId, _accessToken, context = {}) {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new NotFoundError('User not found');

    await this.userRepository.updateById(userId, { refreshToken: null });

    await this.auditService.log({
      action: AuditAction.LOGOUT,
      module: 'auth',
      entityType: 'user',
      entityId: userId,
      entityLabel: user.email,
      description: 'User logged out',
      requestedBy: { id: userId, email: user.email, role: user.role },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    return { message: 'Logged out successfully' };
  }

  /**
   * Get current authenticated user profile.
   */
  async getProfile(userId) {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new NotFoundError('User not found');
    return user.toJSON();
  }

  /**
   * Initiate forgot password flow — generates reset token and sends email.
   * Always returns generic message to prevent email enumeration.
   */
  async forgotPassword(email) {
    const user = await this.userRepository.findByEmail(email);
    let resetToken = null;

    if (user && user.isActive) {
      const generated = generatePasswordResetToken();
      resetToken = generated.resetToken;

      await this.userRepository.updateById(user._id, {
        passwordResetToken: generated.hashedToken,
        passwordResetExpires: new Date(Date.now() + config.passwordReset.expiresInMs),
      });

      await sendPasswordResetEmail(user.email, resetToken);
    }

    return {
      message: 'If an account with that email exists, a password reset link has been sent.',
      ...(config.env === 'development' && resetToken && { devResetToken: resetToken }),
    };
  }

  /**
   * Reset password using a valid one-time reset token.
   */
  async resetPassword(token, newPassword) {
    const user = await this.userRepository.findByPasswordResetToken(token);
    if (!user) throw new BadRequestError('Invalid or expired reset token');

    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.refreshToken = undefined;
    await user.save();

    return { message: 'Password reset successful. Please login with your new password.' };
  }

  /**
   * Change password for authenticated user.
   */
  async changePassword(userId, currentPassword, newPassword) {
    const user = await this.userRepository.findByIdWithPassword(userId);
    if (!user) throw new NotFoundError('User not found');

    const isCurrentValid = await user.comparePassword(currentPassword);
    if (!isCurrentValid) throw new UnauthorizedError('Current password is incorrect');

    user.password = newPassword;
    user.refreshToken = undefined;
    await user.save();

    return { message: 'Password changed successfully. Please login again.' };
  }

  /**
   * Validates whether the requesting user can assign the given role.
   */
  _validateRegistrationRole(role, requestedBy) {
    if (ADMIN_ONLY_ROLES.includes(role)) { // Check if the role is an admin only role to create an admin role.
      if (!requestedBy || ![UserRole.SUPER_ADMIN, UserRole.ADMIN].includes(requestedBy.role)) { // Check if the requested by user is a super admin or admin to create an admin role. 
        throw new ForbiddenError('Insufficient permissions to create this role');
      }
      return;
    }

    if (!SELF_REGISTER_ROLES.includes(role)) { // Check if the role is in the self register roles to register a user.
      throw new ForbiddenError('Invalid role for registration');
    }
  }

  /**
   * Issue JWT tokens and persist hashed refresh token.
   */
  async _issueTokens(user) {
    const tokens = generateTokens(user._id.toString(), user.role);
    const hashedRefreshToken = await bcrypt.hash(tokens.refreshToken, config.bcrypt.saltRounds);

    await this.userRepository.updateById(user._id, {
      refreshToken: hashedRefreshToken,
    });

    return tokens;
  }

  async _auditLoginFailed(email, reason, context = {}) {
    await this.auditService.log({
      action: AuditAction.LOGIN_FAILED,
      module: 'auth',
      entityType: 'user',
      entityLabel: email,
      description: reason,
      actorEmail: email,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      success: false,
      metadata: { reason },
    });
  }
}

module.exports = AuthService;

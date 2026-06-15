const asyncHandler = require('../../../core/utils/asyncHandler');
const { HttpStatus } = require('../../../shared/constants/httpStatus.constants');

/**
 * Auth Controller — HTTP layer for authentication endpoints.
 * Delegates all business logic to AuthService (thin controller pattern).
 */
class AuthController {
  /**
   * @param {import('../services/auth.service')} authService
   */
  constructor(authService) {
    this.authService = authService;
  }

  register = asyncHandler(async (req, res) => {
    const result = await this.authService.register(req.body, req.user || null);

    res.status(HttpStatus.CREATED).json({
      success: true,
      message: 'Registration successful',
      data: result,
    });
  });

  login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const result = await this.authService.login(email, password, {
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.status(HttpStatus.OK).json({
      success: true,
      message: 'Login successful',
      data: result,
    });
  });

  refreshToken = asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;
    const result = await this.authService.refreshToken(refreshToken);

    res.status(HttpStatus.OK).json({
      success: true,
      message: 'Token refreshed successfully',
      data: result,
    });
  });

  logout = asyncHandler(async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    const result = await this.authService.logout(req.user.id, token, {
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.status(HttpStatus.OK).json({
      success: true,
      message: result.message,
    });
  });

  getProfile = asyncHandler(async (req, res) => {
    const user = await this.authService.getProfile(req.user.id);

    res.status(HttpStatus.OK).json({
      success: true,
      data: { user },
    });
  });

  forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;
    const result = await this.authService.forgotPassword(email);

    res.status(HttpStatus.OK).json({
      success: true,
      message: result.message,
      ...(result.devResetToken && { data: { devResetToken: result.devResetToken } }),
    });
  });

  resetPassword = asyncHandler(async (req, res) => {
    const { token, password } = req.body;
    const result = await this.authService.resetPassword(token, password);

    res.status(HttpStatus.OK).json({
      success: true,
      message: result.message,
    });
  });

  changePassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const result = await this.authService.changePassword(
      req.user.id,
      currentPassword,
      newPassword,
    );

    res.status(HttpStatus.OK).json({
      success: true,
      message: result.message,
    });
  });
}

module.exports = AuthController;

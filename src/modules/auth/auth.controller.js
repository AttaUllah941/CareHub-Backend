const { successResponse } = require('../../shared/utils/apiResponse');
const asyncHandler = require('../../shared/utils/asyncHandler');
const authService = require('./auth.service');

const register = asyncHandler(async (req, res) => {
  const data = await authService.register(req.body);
  res.status(201).json(successResponse(data, 'Registration successful'));
});

const login = asyncHandler(async (req, res) => {
  const data = await authService.login(req.body);
  res.status(200).json(successResponse(data, 'Login successful'));
});

const refresh = asyncHandler(async (req, res) => {
  const data = await authService.refresh(req.body);
  res.status(200).json(successResponse(data, 'Token refreshed'));
});

const logout = asyncHandler(async (req, res) => {
  await authService.logout(req.user.id);
  res.status(200).json(successResponse({ message: 'Logged out successfully' }, 'Logged out successfully'));
});

const getProfile = asyncHandler(async (req, res) => {
  const data = await authService.getProfile(req.user.id);
  res.status(200).json(successResponse(data, 'Profile retrieved'));
});

const forgotPassword = asyncHandler(async (req, res) => {
  const data = await authService.forgotPassword(req.body);
  res.status(200).json(successResponse(data, data.message));
});

const resetPassword = asyncHandler(async (req, res) => {
  const data = await authService.resetPassword(req.body);
  res.status(200).json(successResponse(data, data.message));
});

const changePassword = asyncHandler(async (req, res) => {
  const data = await authService.changePassword(req.user.id, req.body);
  res.status(200).json(successResponse(data, data.message));
});

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

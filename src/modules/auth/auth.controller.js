const authService = require('./auth.service');

const register = async (req, res) => {
  const result = await authService.register(req.body);
  res.status(201).json({ success: true, message: 'Registration successful', data: result });
};

const login = async (req, res) => {
  const result = await authService.login(req.body);
  res.json({ success: true, message: 'Login successful', data: result });
};

const getMe = async (req, res) => {
  const result = await authService.getMe(req.user.id);
  res.json({ success: true, message: 'Profile retrieved', data: result });
};

const requestPasswordReset = async (req, res) => {
  const result = await authService.requestPasswordReset(req.body.email);
  res.json({ success: true, message: result.message, data: result });
};

const resetPassword = async (req, res) => {
  const result = await authService.resetPassword(req.body);
  res.json({ success: true, message: result.message, data: result });
};

const refresh = async (req, res) => {
  const result = await authService.refreshSession(req.body.refreshToken);
  res.json({ success: true, message: 'Token refreshed', data: result });
};

const logout = async (_req, res) => {
  const result = await authService.logout();
  res.json({ success: true, message: result.message, data: result });
};

const changePassword = async (req, res) => {
  const result = await authService.changePassword(req.user.id, req.body);
  res.json({ success: true, message: result.message, data: result });
};

module.exports = {
  register,
  login,
  refresh,
  getMe,
  requestPasswordReset,
  resetPassword,
  refresh,
  logout,
  changePassword,
};

const { successResponse } = require('../../core/utils/apiResponse');
const asyncHandler = require('../../core/utils/asyncHandler');
const adminService = require('./admin.service');

const getDashboardStats = asyncHandler(async (req, res) => {
  const data = await adminService.getDashboardStats();
  successResponse(res, data, 'Dashboard stats retrieved');
});

const listUsers = asyncHandler(async (req, res) => {
  const data = await adminService.listUsers(req.query);
  successResponse(res, data, 'Users retrieved');
});

const updateUserStatus = asyncHandler(async (req, res) => {
  const data = await adminService.updateUserStatus(req.params.id, req.body.isActive);
  successResponse(res, data, 'User status updated');
});

module.exports = {
  getDashboardStats,
  listUsers,
  updateUserStatus,
};

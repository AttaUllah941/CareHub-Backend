const { successResponse } = require('../../core/utils/apiResponse');
const asyncHandler = require('../../core/utils/asyncHandler');
const doctorsService = require('./doctors.service');

const setNoCacheHeaders = (res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
};

const searchPublic = asyncHandler(async (req, res) => {
  setNoCacheHeaders(res);
  const data = await doctorsService.searchPublic(req.query);
  successResponse(res, data, 'Doctors retrieved');
});

const getPublicById = asyncHandler(async (req, res) => {
  setNoCacheHeaders(res);
  const data = await doctorsService.getPublicById(req.params.id);
  successResponse(res, data, 'Doctor retrieved');
});

const getMyProfile = asyncHandler(async (req, res) => {
  const data = await doctorsService.getMyProfile(req.user.id);
  successResponse(res, data, 'Doctor profile retrieved');
});

const updateMyProfile = asyncHandler(async (req, res) => {
  const data = await doctorsService.updateMyProfile(req.user.id, req.body);
  successResponse(res, data, 'Doctor profile updated');
});

const listAdmin = asyncHandler(async (req, res) => {
  const data = await doctorsService.listAdmin(req.query);
  successResponse(res, data, 'Doctors retrieved');
});

const updateVerification = asyncHandler(async (req, res) => {
  const data = await doctorsService.updateVerification(req.params.id, req.body);
  successResponse(res, data, 'Doctor verification updated');
});

module.exports = {
  searchPublic,
  getPublicById,
  getMyProfile,
  updateMyProfile,
  listAdmin,
  updateVerification,
};

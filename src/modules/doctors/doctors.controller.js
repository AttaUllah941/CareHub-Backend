const { successResponse } = require('../../shared/utils/apiResponse');
const asyncHandler = require('../../shared/utils/asyncHandler');
const doctorsService = require('./doctors.service');

const searchPublic = asyncHandler(async (req, res) => {
  const data = await doctorsService.searchPublic(req.query);
  res.status(200).json(successResponse(data, 'Doctors retrieved'));
});

const getPublicById = asyncHandler(async (req, res) => {
  const data = await doctorsService.getPublicById(req.params.id);
  res.status(200).json(successResponse(data, 'Doctor retrieved'));
});

const getMyProfile = asyncHandler(async (req, res) => {
  const data = await doctorsService.getMyProfile(req.user.id);
  res.status(200).json(successResponse(data, 'Doctor profile retrieved'));
});

const updateMyProfile = asyncHandler(async (req, res) => {
  const data = await doctorsService.updateMyProfile(req.user.id, req.body);
  res.status(200).json(successResponse(data, 'Doctor profile updated'));
});

const listAdmin = asyncHandler(async (req, res) => {
  const data = await doctorsService.listAdmin(req.query);
  res.status(200).json(successResponse(data, 'Doctors retrieved'));
});

const updateVerification = asyncHandler(async (req, res) => {
  const data = await doctorsService.updateVerification(req.params.id, req.body);
  res.status(200).json(successResponse(data, 'Doctor verification updated'));
});

module.exports = {
  searchPublic,
  getPublicById,
  getMyProfile,
  updateMyProfile,
  listAdmin,
  updateVerification,
};

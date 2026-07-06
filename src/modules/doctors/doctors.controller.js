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
  const data = await doctorsService.searchPublicDoctors(req.query);
  successResponse(res, data, 'Doctors retrieved');
});

const getPublicById = asyncHandler(async (req, res) => {
  setNoCacheHeaders(res);
  const data = await doctorsService.getPublicDoctorById(req.params.id);
  successResponse(res, data, 'Doctor profile retrieved');
});

module.exports = {
  searchPublic,
  getPublicById,
};

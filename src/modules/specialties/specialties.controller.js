const { successResponse } = require('../../core/utils/apiResponse');
const asyncHandler = require('../../core/utils/asyncHandler');
const specialtiesService = require('./specialties.service');

const setNoCacheHeaders = (res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
};

const listPublic = asyncHandler(async (_req, res) => {
  setNoCacheHeaders(res);
  const data = await specialtiesService.listPublicSpecialties();
  successResponse(res, data, 'Medical specialties retrieved');
});

const getBySlug = asyncHandler(async (req, res) => {
  setNoCacheHeaders(res);
  const data = await specialtiesService.getSpecialtyBySlug(req.params.slug);
  successResponse(res, data, 'Medical specialty retrieved');
});

module.exports = {
  listPublic,
  getBySlug,
};

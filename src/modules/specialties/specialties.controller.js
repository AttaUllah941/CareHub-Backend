const { successResponse } = require('../../core/utils/apiResponse');
const asyncHandler = require('../../core/utils/asyncHandler');
const specialtiesService = require('./specialties.service');

const listPublic = asyncHandler(async (_req, res) => {
  const data = await specialtiesService.listPublicSpecialties();
  successResponse(res, data, 'Medical specialties retrieved');
});

const getBySlug = asyncHandler(async (req, res) => {
  const data = await specialtiesService.getSpecialtyBySlug(req.params.slug);
  successResponse(res, data, 'Medical specialty retrieved');
});

module.exports = {
  listPublic,
  getBySlug,
};

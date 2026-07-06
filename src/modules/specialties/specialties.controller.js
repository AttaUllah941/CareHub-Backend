const { HttpStatus } = require('../../shared/constants/httpStatus.constants');
const { successResponse } = require('../../core/utils/apiResponse');
const asyncHandler = require('../../core/utils/asyncHandler');
const specialtiesService = require('./specialties.service');

const setNoCacheHeaders = (res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
};

const listPublic = asyncHandler(async (req, res) => {
  setNoCacheHeaders(res);
  const data = await specialtiesService.listPublic(req.query.search);
  successResponse(res, data, 'Medical specialties retrieved');
});

const getPublicBySlug = asyncHandler(async (req, res) => {
  setNoCacheHeaders(res);
  const data = await specialtiesService.getPublicBySlug(req.params.slug);
  successResponse(res, data, 'Medical specialty retrieved');
});

const create = asyncHandler(async (req, res) => {
  const data = await specialtiesService.create(req.body);
  successResponse(res, data, 'Medical specialty created', HttpStatus.CREATED);
});

const update = asyncHandler(async (req, res) => {
  const data = await specialtiesService.update(req.params.id, req.body);
  successResponse(res, data, 'Medical specialty updated');
});

const remove = asyncHandler(async (req, res) => {
  const data = await specialtiesService.remove(req.params.id);
  successResponse(res, data, 'Medical specialty deactivated');
});

module.exports = {
  listPublic,
  getPublicBySlug,
  create,
  update,
  remove,
};

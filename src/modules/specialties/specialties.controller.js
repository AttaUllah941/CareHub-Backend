const { successResponse } = require('../../core/utils/apiResponse');
const asyncHandler = require('../../core/utils/asyncHandler');
const { setPublicReferenceCacheHeaders } = require('../../shared/utils/publicCacheHeaders');
const specialtiesService = require('./specialties.service');

const listPublic = asyncHandler(async (req, res) => {
  setPublicReferenceCacheHeaders(res);
  const data = await specialtiesService.listPublic(req.query.search);
  successResponse(res, data, 'Medical specialties retrieved');
});

const getPublicBySlug = asyncHandler(async (req, res) => {
  setPublicReferenceCacheHeaders(res);
  const data = await specialtiesService.getPublicBySlug(req.params.slug);
  successResponse(res, data, 'Medical specialty retrieved');
});

const create = asyncHandler(async (req, res) => {
  const data = await specialtiesService.create(req.body);
  successResponse(res, data, 'Medical specialty created', 201);
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

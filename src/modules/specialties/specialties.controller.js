const { successResponse } = require('../../shared/utils/apiResponse');
const asyncHandler = require('../../shared/utils/asyncHandler');
const specialtiesService = require('./specialties.service');

const listPublic = asyncHandler(async (req, res) => {
  const data = await specialtiesService.listPublic(req.query.search);
  res.status(200).json(successResponse(data, 'Medical specialties retrieved'));
});

const getPublicBySlug = asyncHandler(async (req, res) => {
  const data = await specialtiesService.getPublicBySlug(req.params.slug);
  res.status(200).json(successResponse(data, 'Medical specialty retrieved'));
});

const create = asyncHandler(async (req, res) => {
  const data = await specialtiesService.create(req.body);
  res.status(201).json(successResponse(data, 'Medical specialty created'));
});

const update = asyncHandler(async (req, res) => {
  const data = await specialtiesService.update(req.params.id, req.body);
  res.status(200).json(successResponse(data, 'Medical specialty updated'));
});

const remove = asyncHandler(async (req, res) => {
  const data = await specialtiesService.remove(req.params.id);
  res.status(200).json(successResponse(data, 'Medical specialty deactivated'));
});

module.exports = {
  listPublic,
  getPublicBySlug,
  create,
  update,
  remove,
};

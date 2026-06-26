const { successResponse } = require('../../shared/utils/apiResponse');
const asyncHandler = require('../../shared/utils/asyncHandler');
const languagesService = require('./languages.service');

const listPublic = asyncHandler(async (req, res) => {
  const data = await languagesService.listPublic(req.query.search);
  res.status(200).json(successResponse(data, 'Languages retrieved'));
});

const getPublicBySlug = asyncHandler(async (req, res) => {
  const data = await languagesService.getPublicByCode(req.params.slug);
  res.status(200).json(successResponse(data, 'Language retrieved'));
});

const create = asyncHandler(async (req, res) => {
  const data = await languagesService.create(req.body);
  res.status(201).json(successResponse(data, 'Language created'));
});

const update = asyncHandler(async (req, res) => {
  const data = await languagesService.update(req.params.id, req.body);
  res.status(200).json(successResponse(data, 'Language updated'));
});

const remove = asyncHandler(async (req, res) => {
  const data = await languagesService.remove(req.params.id);
  res.status(200).json(successResponse(data, 'Language deactivated'));
});

module.exports = {
  listPublic,
  getPublicBySlug,
  create,
  update,
  remove,
};

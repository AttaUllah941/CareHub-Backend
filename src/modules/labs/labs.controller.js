const { HttpStatus } = require('../../shared/constants/httpStatus.constants');
const { successResponse } = require('../../core/utils/apiResponse');
const asyncHandler = require('../../core/utils/asyncHandler');
const labsService = require('./labs.service');

const listPublic = asyncHandler(async (req, res) => {
  const data = await labsService.listPublicLabs(req.query);
  successResponse(res, data, 'Labs retrieved');
});

const getPublicDetail = asyncHandler(async (req, res) => {
  const data = await labsService.getPublicLabDetail(req.params.id);
  successResponse(res, data, 'Lab retrieved');
});

const listPublicTests = asyncHandler(async (req, res) => {
  const data = await labsService.listPublicLabTests(req.params.id, req.query);
  successResponse(res, data, 'Lab tests retrieved');
});

const create = asyncHandler(async (req, res) => {
  const data = await labsService.createLab(req.body);
  successResponse(res, data, 'Lab created', HttpStatus.CREATED);
});

const update = asyncHandler(async (req, res) => {
  const data = await labsService.updateLab(req.params.id, req.body);
  successResponse(res, data, 'Lab updated');
});

const remove = asyncHandler(async (req, res) => {
  const data = await labsService.deleteLab(req.params.id);
  successResponse(res, data, 'Lab deleted');
});

const createTest = asyncHandler(async (req, res) => {
  const data = await labsService.createLabTest(req.params.labId, req.body);
  successResponse(res, data, 'Lab test created', HttpStatus.CREATED);
});

const updateTest = asyncHandler(async (req, res) => {
  const data = await labsService.updateLabTest(req.params.labId, req.params.testId, req.body);
  successResponse(res, data, 'Lab test updated');
});

const removeTest = asyncHandler(async (req, res) => {
  const data = await labsService.deleteLabTest(req.params.labId, req.params.testId);
  successResponse(res, data, 'Lab test deleted');
});

module.exports = {
  listPublic,
  getPublicDetail,
  listPublicTests,
  create,
  update,
  remove,
  createTest,
  updateTest,
  removeTest,
};

const { HttpStatus } = require('../../shared/constants/httpStatus.constants');
const { successResponse } = require('../../core/utils/apiResponse');
const asyncHandler = require('../../core/utils/asyncHandler');
const surgeriesService = require('./surgeries.service');

const listPublicProcedures = asyncHandler(async (req, res) => {
  const data = await surgeriesService.listPublicProcedures(req.query);
  successResponse(res, data, 'Surgery procedures retrieved');
});

const getPublicProcedureDetail = asyncHandler(async (req, res) => {
  const data = await surgeriesService.getPublicProcedureDetail(req.params.slug);
  successResponse(res, data, 'Surgery procedure retrieved');
});

const createProcedure = asyncHandler(async (req, res) => {
  const data = await surgeriesService.createProcedure(req.body);
  successResponse(res, data, 'Surgery procedure created', HttpStatus.CREATED);
});

const updateProcedure = asyncHandler(async (req, res) => {
  const data = await surgeriesService.updateProcedure(req.params.id, req.body);
  successResponse(res, data, 'Surgery procedure updated');
});

const deleteProcedure = asyncHandler(async (req, res) => {
  const data = await surgeriesService.deleteProcedure(req.params.id);
  successResponse(res, data, 'Surgery procedure deleted');
});

module.exports = {
  listPublicProcedures,
  getPublicProcedureDetail,
  createProcedure,
  updateProcedure,
  deleteProcedure,
};

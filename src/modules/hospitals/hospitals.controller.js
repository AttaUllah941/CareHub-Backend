const { HttpStatus } = require('../../shared/constants/httpStatus.constants');
const { successResponse } = require('../../core/utils/apiResponse');
const asyncHandler = require('../../core/utils/asyncHandler');
const hospitalsService = require('./hospitals.service');

const listPublic = asyncHandler(async (req, res) => {
  const data = await hospitalsService.listPublicHospitals(req.query);
  successResponse(res, data, 'Hospitals retrieved');
});

const getPublicDetail = asyncHandler(async (req, res) => {
  const data = await hospitalsService.getPublicHospitalDetail(
    req.params.citySlug,
    req.params.slug,
  );
  successResponse(res, data, 'Hospital retrieved');
});

const create = asyncHandler(async (req, res) => {
  const data = await hospitalsService.createHospital(req.body);
  successResponse(res, data, 'Hospital created', HttpStatus.CREATED);
});

const update = asyncHandler(async (req, res) => {
  const data = await hospitalsService.updateHospital(req.params.id, req.body);
  successResponse(res, data, 'Hospital updated');
});

const remove = asyncHandler(async (req, res) => {
  const data = await hospitalsService.deleteHospital(req.params.id);
  successResponse(res, data, 'Hospital deleted');
});

const linkDoctor = asyncHandler(async (req, res) => {
  const data = await hospitalsService.linkDoctor(req.params.id, req.body.doctorId);
  successResponse(res, data, 'Doctor linked to hospital');
});

const unlinkDoctor = asyncHandler(async (req, res) => {
  const data = await hospitalsService.unlinkDoctor(req.params.id, req.params.doctorId);
  successResponse(res, data, 'Doctor unlinked from hospital');
});

module.exports = {
  listPublic,
  getPublicDetail,
  create,
  update,
  remove,
  linkDoctor,
  unlinkDoctor,
};

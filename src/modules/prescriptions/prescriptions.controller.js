const { successResponse } = require('../../core/utils/apiResponse');
const asyncHandler = require('../../core/utils/asyncHandler');
const prescriptionsService = require('./prescriptions.service');

const listMine = asyncHandler(async (req, res) => {
  const data = await prescriptionsService.listForDoctor(req.doctor, req.query);
  successResponse(res, data, 'Prescriptions retrieved');
});

const create = asyncHandler(async (req, res) => {
  const data = await prescriptionsService.createForDoctor(req.doctor, req.body);
  successResponse(res, data, 'Prescription created', 201);
});

const listPatientMine = asyncHandler(async (req, res) => {
  const data = await prescriptionsService.listForPatient(req.user, req.query);
  successResponse(res, data, 'Prescriptions retrieved');
});

module.exports = {
  listMine,
  listPatientMine,
  create,
};

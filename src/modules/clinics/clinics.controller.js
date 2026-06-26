const { successResponse } = require('../../shared/utils/apiResponse');
const asyncHandler = require('../../shared/utils/asyncHandler');
const clinicsService = require('./clinics.service');

const listByDoctor = asyncHandler(async (req, res) => {
  const data = await clinicsService.listByDoctorId(req.params.doctorId);
  res.status(200).json(successResponse(data, 'Clinics retrieved'));
});

const create = asyncHandler(async (req, res) => {
  const data = await clinicsService.createForDoctor(req.doctor, req.body);
  res.status(201).json(successResponse(data, 'Clinic created'));
});

const update = asyncHandler(async (req, res) => {
  const data = await clinicsService.updateClinic(req.resource, req.body);
  res.status(200).json(successResponse(data, 'Clinic updated'));
});

const remove = asyncHandler(async (req, res) => {
  const data = await clinicsService.deleteClinic(req.resource);
  res.status(200).json(successResponse(data, 'Clinic deactivated'));
});

module.exports = {
  listByDoctor,
  create,
  update,
  remove,
};

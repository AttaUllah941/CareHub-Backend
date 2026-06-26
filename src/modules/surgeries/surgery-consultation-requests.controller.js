const { HttpStatus } = require('../../shared/constants/httpStatus.constants');
const { successResponse } = require('../../core/utils/apiResponse');
const asyncHandler = require('../../core/utils/asyncHandler');
const surgeriesService = require('./surgeries.service');

const create = asyncHandler(async (req, res) => {
  const data = await surgeriesService.createConsultationRequest(req.body, req.user);
  successResponse(res, data, 'Consultation request submitted', HttpStatus.CREATED);
});

const listMine = asyncHandler(async (req, res) => {
  const data = await surgeriesService.listMyConsultationRequests(req.user, req.query);
  successResponse(res, data, 'Consultation requests retrieved');
});

const listAdmin = asyncHandler(async (req, res) => {
  const data = await surgeriesService.listAdminConsultationRequests(req.query);
  successResponse(res, data, 'Consultation requests retrieved');
});

const updateStatus = asyncHandler(async (req, res) => {
  const data = await surgeriesService.updateConsultationRequestStatus(
    req.params.id,
    req.body.status,
  );
  successResponse(res, data, 'Consultation request updated');
});

module.exports = {
  create,
  listMine,
  listAdmin,
  updateStatus,
};

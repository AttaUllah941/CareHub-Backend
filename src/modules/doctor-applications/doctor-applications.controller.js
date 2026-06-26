const { HttpStatus } = require('../../shared/constants/httpStatus.constants');
const { successResponse } = require('../../core/utils/apiResponse');
const asyncHandler = require('../../core/utils/asyncHandler');
const doctorApplicationsService = require('./doctor-applications.service');

const create = asyncHandler(async (req, res) => {
  const data = await doctorApplicationsService.createApplication(req.body);
  successResponse(res, data, 'Doctor application submitted', HttpStatus.CREATED);
});

const list = asyncHandler(async (req, res) => {
  const data = await doctorApplicationsService.listApplications(req.query);
  successResponse(res, data, 'Doctor applications retrieved');
});

const getById = asyncHandler(async (req, res) => {
  const data = await doctorApplicationsService.getApplicationById(req.params.id);
  successResponse(res, data, 'Doctor application retrieved');
});

const approve = asyncHandler(async (req, res) => {
  const data = await doctorApplicationsService.approveApplication(req.params.id, req.user);
  successResponse(res, data, 'Doctor application approved');
});

const reject = asyncHandler(async (req, res) => {
  const data = await doctorApplicationsService.rejectApplication(
    req.params.id,
    req.user,
    req.body.rejectionReason,
  );
  successResponse(res, data, 'Doctor application rejected');
});

module.exports = {
  create,
  list,
  getById,
  approve,
  reject,
};

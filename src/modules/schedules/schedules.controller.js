const { successResponse } = require('../../shared/utils/apiResponse');
const asyncHandler = require('../../shared/utils/asyncHandler');
const schedulesService = require('./schedules.service');

const getAvailability = asyncHandler(async (req, res) => {
  const data = await schedulesService.getAvailability(req.params.doctorId, req.query.date);
  res.status(200).json(successResponse(data, 'Availability retrieved'));
});

const create = asyncHandler(async (req, res) => {
  const data = await schedulesService.createSchedule(req.doctor, req.body);
  res.status(201).json(successResponse(data, 'Schedule created'));
});

const listMine = asyncHandler(async (req, res) => {
  const data = await schedulesService.listMySchedules(req.doctor);
  res.status(200).json(successResponse(data, 'Schedules retrieved'));
});

module.exports = {
  getAvailability,
  create,
  listMine,
};

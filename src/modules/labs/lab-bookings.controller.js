const { HttpStatus } = require('../../shared/constants/httpStatus.constants');
const { successResponse } = require('../../core/utils/apiResponse');
const asyncHandler = require('../../core/utils/asyncHandler');
const labsService = require('./labs.service');

const create = asyncHandler(async (req, res) => {
  const data = await labsService.createBooking(req.body, req.user);
  successResponse(res, data, 'Lab booking created', HttpStatus.CREATED);
});

const listMine = asyncHandler(async (req, res) => {
  const data = await labsService.listMyBookings(req.user, req.query);
  successResponse(res, data, 'Lab bookings retrieved');
});

const cancel = asyncHandler(async (req, res) => {
  const data = await labsService.cancelBooking(req.params.id, req.user);
  successResponse(res, data, 'Lab booking cancelled');
});

module.exports = {
  create,
  listMine,
  cancel,
};

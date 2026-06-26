const { body, param } = require('express-validator');
const { HttpStatus } = require('../../shared/constants/httpStatus.constants');
const { successResponse } = require('../../core/utils/apiResponse');
const asyncHandler = require('../../core/utils/asyncHandler');
const reviewsService = require('./reviews.service');

const listByDoctor = asyncHandler(async (req, res) => {
  const data = await reviewsService.listDoctorReviews(req.params.doctorId, req.query);
  successResponse(res, data, 'Reviews retrieved');
});

const create = asyncHandler(async (req, res) => {
  const data = await reviewsService.createReview(req.params.doctorId, req.body, req.user);
  successResponse(res, data, 'Review created', HttpStatus.CREATED);
});

const update = asyncHandler(async (req, res) => {
  const data = await reviewsService.updateReview(req.params.id, req.body, req.user);
  successResponse(res, data, 'Review updated');
});

const remove = asyncHandler(async (req, res) => {
  const data = await reviewsService.deleteReview(req.params.id, req.user);
  successResponse(res, data, 'Review deleted');
});

module.exports = {
  listByDoctor,
  create,
  update,
  remove,
};

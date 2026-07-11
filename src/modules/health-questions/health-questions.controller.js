const { HttpStatus } = require('../../shared/constants/httpStatus.constants');
const { successResponse } = require('../../core/utils/apiResponse');
const asyncHandler = require('../../core/utils/asyncHandler');
const healthQuestionsService = require('./health-questions.service');

const create = asyncHandler(async (req, res) => {
  const data = await healthQuestionsService.createQuestion(req.body, req.user);
  successResponse(
    res,
    data,
    'Your question has been submitted. A doctor will respond within 24 hours.',
    HttpStatus.CREATED,
  );
});

const listPublic = asyncHandler(async (req, res) => {
  const data = await healthQuestionsService.listPublicAnswered(req.query);
  successResponse(res, data, 'Health advice questions retrieved');
});

const listMine = asyncHandler(async (req, res) => {
  const data = await healthQuestionsService.listMine(req.user, req.query);
  successResponse(res, data, 'Your questions retrieved');
});

module.exports = {
  create,
  listPublic,
  listMine,
};

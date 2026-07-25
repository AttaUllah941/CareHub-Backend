const { HttpStatus } = require('../../shared/constants/httpStatus.constants');
const { successResponse } = require('../../core/utils/apiResponse');
const asyncHandler = require('../../core/utils/asyncHandler');
const uploadsService = require('./uploads.service');

const resolveUploadFolder = (req) => {
  if (req.path === '/application') {
    return 'doctor-applications';
  }

  if (req.path === '/prescriptions') {
    return 'prescriptions';
  }

  return 'general';
};

const upload = asyncHandler(async (req, res) => {
  const data = await uploadsService.uploadFile(req.file, resolveUploadFolder(req));
  successResponse(res, data, 'File uploaded', HttpStatus.CREATED);
});

module.exports = {
  upload,
};

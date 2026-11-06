const { Router } = require('express');
const uploadsController = require('./uploads.controller');
const { upload, handleMulterError } = require('./uploads.multer');
const { authenticate } = require('../../core/middleware/auth.middleware');
const { anonymousUploadLimiter } = require('../../shared/middleware/rateLimit.middleware');

const router = Router();

router.post(
  '/',
  authenticate,
  upload.single('file'),
  handleMulterError,
  uploadsController.upload,
);

router.post(
  '/application',
  anonymousUploadLimiter,
  upload.single('file'),
  handleMulterError,
  uploadsController.upload,
);

module.exports = router;

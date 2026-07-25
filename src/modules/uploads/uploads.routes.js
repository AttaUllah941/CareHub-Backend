const { Router } = require('express');
const uploadsController = require('./uploads.controller');
const { upload, handleMulterError } = require('./uploads.multer');
const { authenticate } = require('../../core/middleware/auth.middleware');

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
  upload.single('file'),
  handleMulterError,
  uploadsController.upload,
);

module.exports = router;

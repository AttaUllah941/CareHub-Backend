const multer = require('multer');
const config = require('../../config');
const { BadRequestError } = require('../../core/errors/AppError');

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
]);

const maxFileSizeBytes = config.storage.maxFileSizeMb * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maxFileSizeBytes },
  fileFilter: (_req, file, callback) => {
    if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
      callback(null, true);
      return;
    }

    callback(new BadRequestError('Only PDF, JPG, and PNG files are allowed'));
  },
});

const handleMulterError = (error, _req, _res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return next(
        new BadRequestError(`File size must not exceed ${config.storage.maxFileSizeMb}MB`),
      );
    }

    return next(new BadRequestError(error.message));
  }

  return next(error);
};

module.exports = {
  upload,
  handleMulterError,
  ALLOWED_MIME_TYPES,
};

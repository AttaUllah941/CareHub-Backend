const { body, param } = require('express-validator');

const sessionIdParam = [param('id').isMongoId().withMessage('Invalid session ID')];
const appointmentIdParam = [param('appointmentId').isMongoId().withMessage('Invalid appointment ID')];

const chatMessageDto = [body('message').trim().notEmpty().isLength({ max: 2000 })];

const stopRecordingDto = [
  body('storageKey').optional().trim().isLength({ max: 500 }),
  body('fileSizeBytes').optional().isInt({ min: 0 }),
  body('durationSeconds').optional().isInt({ min: 0 }),
];

module.exports = {
  sessionIdParam,
  appointmentIdParam,
  chatMessageDto,
  stopRecordingDto,
};

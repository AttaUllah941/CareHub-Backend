const { body, param, query } = require('express-validator');

const mongoId = (field) => param(field).isMongoId();

const listConversationsQueryDto = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
];

const createConversationDto = [
  body('doctorUserId').optional().isMongoId(),
  body('patientUserId').optional().isMongoId(),
  body('appointmentId').optional().isMongoId(),
];

const listMessagesQueryDto = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('before').optional().isISO8601(),
];

const sendMessageDto = [
  body('content').trim().notEmpty().isLength({ max: 4000 }),
];

const uploadAttachmentDto = [
  body('caption').optional().trim().isLength({ max: 500 }),
];

const markReadDto = [
  body('messageId').optional().isMongoId(),
];

module.exports = {
  mongoId,
  listConversationsQueryDto,
  createConversationDto,
  listMessagesQueryDto,
  sendMessageDto,
  uploadAttachmentDto,
  markReadDto,
};

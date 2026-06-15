const { Router } = require('express');
const container = require('../../../core/container');
const validate = require('../../../core/middleware/validate.middleware');
const { authenticate, authorize } = require('../../../core/middleware/auth.middleware');
const { uploadChatAttachment } = require('../../../core/middleware/upload.middleware');
const { UserRole } = require('../../../shared/enums/userRole.enum');
const {
  mongoId,
  listConversationsQueryDto,
  createConversationDto,
  listMessagesQueryDto,
  sendMessageDto,
  uploadAttachmentDto,
  markReadDto,
} = require('../dto/chat.dto');

const router = Router();
const chatController = container.resolve('chatController');

const chatRoles = [UserRole.DOCTOR, UserRole.PATIENT, UserRole.SUPER_ADMIN, UserRole.ADMIN];

router.get(
  '/conversations',
  authenticate,
  authorize(...chatRoles),
  listConversationsQueryDto,
  validate,
  chatController.getConversations,
);

router.post(
  '/conversations',
  authenticate,
  authorize(UserRole.DOCTOR, UserRole.PATIENT),
  createConversationDto,
  validate,
  chatController.createConversation,
);

router.get(
  '/conversations/:id',
  authenticate,
  authorize(...chatRoles),
  mongoId('id'),
  validate,
  chatController.getConversation,
);

router.get(
  '/conversations/:id/messages',
  authenticate,
  authorize(...chatRoles),
  mongoId('id'),
  listMessagesQueryDto,
  validate,
  chatController.getMessages,
);

router.post(
  '/conversations/:id/messages',
  authenticate,
  authorize(UserRole.DOCTOR, UserRole.PATIENT),
  mongoId('id'),
  sendMessageDto,
  validate,
  chatController.sendMessage,
);

router.post(
  '/conversations/:id/attachments',
  authenticate,
  authorize(UserRole.DOCTOR, UserRole.PATIENT),
  mongoId('id'),
  uploadChatAttachment,
  uploadAttachmentDto,
  validate,
  chatController.uploadAttachment,
);

router.patch(
  '/conversations/:id/read',
  authenticate,
  authorize(UserRole.DOCTOR, UserRole.PATIENT),
  mongoId('id'),
  markReadDto,
  validate,
  chatController.markRead,
);

router.get(
  '/messages/:messageId/download',
  authenticate,
  authorize(...chatRoles),
  mongoId('messageId'),
  validate,
  chatController.downloadAttachment,
);

module.exports = router;

const asyncHandler = require('../../../core/utils/asyncHandler');
const { HttpStatus } = require('../../../shared/constants/httpStatus.constants');
const { getSocketIo } = require('../../../config/socketRegistry');

class ChatController {
  constructor(chatService) {
    this.chatService = chatService;
  }

  _emitMessage(conversationId, message) {
    const io = getSocketIo();
    if (!io) return;
    io.to(`chat:${conversationId}`).emit('chat:message', { message, conversationId });
  }

  getConversations = asyncHandler(async (req, res) => {
    const result = await this.chatService.listConversations(req.query, req.user);
    res.status(HttpStatus.OK).json({ success: true, data: result });
  });

  getConversation = asyncHandler(async (req, res) => {
    const conversation = await this.chatService.getConversation(req.params.id, req.user);
    res.status(HttpStatus.OK).json({ success: true, data: { conversation } });
  });

  createConversation = asyncHandler(async (req, res) => {
    const conversation = await this.chatService.getOrCreateConversation(req.body, req.user);
    res.status(HttpStatus.OK).json({ success: true, data: { conversation } });
  });

  getMessages = asyncHandler(async (req, res) => {
    const result = await this.chatService.getMessages(req.params.id, req.user, req.query);
    res.status(HttpStatus.OK).json({ success: true, data: result });
  });

  sendMessage = asyncHandler(async (req, res) => {
    const message = await this.chatService.sendTextMessage(
      req.params.id,
      req.user.id,
      req.body.content,
    );
    this._emitMessage(req.params.id, message);
    res.status(HttpStatus.CREATED).json({ success: true, data: { message } });
  });

  uploadAttachment = asyncHandler(async (req, res) => {
    const message = await this.chatService.sendAttachmentMessage(
      req.params.id,
      req.user.id,
      req.file,
      req.body.caption,
    );
    this._emitMessage(req.params.id, message);
    res.status(HttpStatus.CREATED).json({ success: true, data: { message } });
  });

  markRead = asyncHandler(async (req, res) => {
    const result = await this.chatService.markAsRead(
      req.params.id,
      req.user.id,
      req.body.messageId,
    );
    res.status(HttpStatus.OK).json({ success: true, data: result });
  });

  downloadAttachment = asyncHandler(async (req, res) => {
    const { buffer, originalFileName, mimeType } = await this.chatService.downloadAttachment(
      req.params.messageId,
      req.user,
    );
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${originalFileName}"`);
    res.send(buffer);
  });
}

module.exports = ChatController;

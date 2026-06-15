const path = require('path');
const fs = require('fs');
const {
  NotFoundError,
  ForbiddenError,
  BadRequestError,
} = require('../../../core/errors/AppError');
const { UserRole } = require('../../../shared/enums/userRole.enum');
const { ChatMessageType } = require('../../../shared/enums/chatMessageType.enum');
const config = require('../../../config');

class ChatService {
  constructor(
    chatConversationRepository,
    chatMessageRepository,
    appointmentRepository,
    patientProfileRepository,
    doctorProfileRepository,
  ) {
    this.chatConversationRepository = chatConversationRepository;
    this.chatMessageRepository = chatMessageRepository;
    this.appointmentRepository = appointmentRepository;
    this.patientProfileRepository = patientProfileRepository;
    this.doctorProfileRepository = doctorProfileRepository;
  }

  _isAdmin(requestedBy) {
    return requestedBy && [UserRole.SUPER_ADMIN, UserRole.ADMIN].includes(requestedBy.role);
  }

  _formatUser(user) {
    if (!user || typeof user !== 'object') return undefined;
    return {
      id: user.id || user._id?.toString(),
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
    };
  }

  _formatConversation(conv, requestedBy) {
    const json = conv.toJSON ? conv.toJSON() : conv;
    const doctorUserId =
      json.doctorUserId?.id || json.doctorUserId?._id?.toString() || json.doctorUserId?.toString();
    const patientUserId =
      json.patientUserId?.id || json.patientUserId?._id?.toString() || json.patientUserId?.toString();
    const isDoctor = requestedBy?.id === doctorUserId;
    const unreadCount = isDoctor ? json.doctorUnreadCount : json.patientUnreadCount;

    return {
      ...json,
      doctorUserId,
      patientUserId,
      appointmentId:
        json.appointmentId?.id || json.appointmentId?._id?.toString() || json.appointmentId?.toString(),
      doctor: this._formatUser(json.doctorUserId),
      patient: this._formatUser(json.patientUserId),
      unreadCount: unreadCount || 0,
      otherParticipant: isDoctor ? this._formatUser(json.patientUserId) : this._formatUser(json.doctorUserId),
    };
  }

  _formatMessage(msg) {
    const json = msg.toJSON ? msg.toJSON() : msg;
    return {
      ...json,
      conversationId:
        json.conversationId?.id || json.conversationId?._id?.toString() || json.conversationId?.toString(),
      senderUserId:
        json.senderUserId?.id || json.senderUserId?._id?.toString() || json.senderUserId?.toString(),
      sender: this._formatUser(json.senderUserId),
      readBy: (json.readBy || []).map((r) => ({
        userId: r.userId?.toString?.() || r.userId,
        readAt: r.readAt,
      })),
      deliveredTo: (json.deliveredTo || []).map((d) => ({
        userId: d.userId?.toString?.() || d.userId,
        deliveredAt: d.deliveredAt,
      })),
    };
  }

  async verifyConversationAccess(conversationId, userId) {
    const conversation = await this.chatConversationRepository.findById(conversationId);
    if (!conversation || !conversation.isActive) return null;

    const doctorId = conversation.doctorUserId?._id?.toString() || conversation.doctorUserId?.toString();
    const patientId = conversation.patientUserId?._id?.toString() || conversation.patientUserId?.toString();

    if (userId === doctorId || userId === patientId) return conversation;
    return null;
  }

  async _assertCanChat(doctorUserId, patientUserId) {
    const doctorProfile = await this.doctorProfileRepository.findByUserId(doctorUserId);
    const patientProfile = await this.patientProfileRepository.findByUserId(patientUserId);
    if (!doctorProfile || !patientProfile) {
      throw new BadRequestError('Invalid doctor or patient');
    }

    const hasAppointment = await this.appointmentRepository.existsBetweenProfiles(
      doctorProfile._id,
      patientProfile._id,
    );
    if (!hasAppointment) {
      throw new ForbiddenError('Chat is only available after booking an appointment');
    }

    return { doctorProfile, patientProfile };
  }

  async getOrCreateConversation(payload, requestedBy) {
    let doctorUserId = payload.doctorUserId;
    let patientUserId = payload.patientUserId;

    if (requestedBy.role === UserRole.DOCTOR) {
      doctorUserId = requestedBy.id;
      if (!patientUserId) throw new BadRequestError('patientUserId is required');
    } else if (requestedBy.role === UserRole.PATIENT) {
      patientUserId = requestedBy.id;
      if (!doctorUserId) throw new BadRequestError('doctorUserId is required');
    } else if (!this._isAdmin(requestedBy)) {
      throw new ForbiddenError('Only doctors and patients can start conversations');
    }

    if (!doctorUserId || !patientUserId) {
      throw new BadRequestError('doctorUserId and patientUserId are required');
    }

    await this._assertCanChat(doctorUserId, patientUserId);

    let conversation = await this.chatConversationRepository.findByParticipants(doctorUserId, patientUserId);
    if (!conversation) {
      conversation = await this.chatConversationRepository.create({
        doctorUserId,
        patientUserId,
        appointmentId: payload.appointmentId,
      });
      conversation = await this.chatConversationRepository.findById(conversation._id);
    }

    return this._formatConversation(conversation, requestedBy);
  }

  async listConversations(query, requestedBy) {
    const result = await this.chatConversationRepository.findForUser(requestedBy.id, query);
    return {
      conversations: result.items.map((c) => this._formatConversation(c, requestedBy)),
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    };
  }

  async getConversation(id, requestedBy) {
    const conversation = await this.verifyConversationAccess(id, requestedBy.id);
    if (!conversation && !this._isAdmin(requestedBy)) {
      throw new NotFoundError('Conversation not found');
    }
    const conv = conversation || (await this.chatConversationRepository.findById(id));
    if (!conv) throw new NotFoundError('Conversation not found');
    return this._formatConversation(conv, requestedBy);
  }

  async getMessages(conversationId, requestedBy, query = {}) {
    const conversation = await this.verifyConversationAccess(conversationId, requestedBy.id);
    if (!conversation && !this._isAdmin(requestedBy)) {
      throw new NotFoundError('Conversation not found');
    }

    const result = await this.chatMessageRepository.findByConversation(conversationId, query);
    return {
      messages: result.items.map((m) => this._formatMessage(m)),
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    };
  }

  _recipientRole(conversation, senderUserId) {
    const doctorId = conversation.doctorUserId?._id?.toString() || conversation.doctorUserId?.toString();
    return senderUserId === doctorId ? 'PATIENT' : 'DOCTOR';
  }

  async sendTextMessage(conversationId, senderUserId, content) {
    if (!content?.trim()) throw new BadRequestError('Message content is required');

    const conversation = await this.verifyConversationAccess(conversationId, senderUserId);
    if (!conversation) throw new ForbiddenError('Access denied');

    const message = await this.chatMessageRepository.create({
      conversationId,
      senderUserId,
      content: content.trim(),
      messageType: ChatMessageType.TEXT,
    });

    const populated = await this.chatMessageRepository.findById(message._id);
    const preview = content.trim().slice(0, 200);

    await this.chatConversationRepository.updateById(conversationId, {
      lastMessageAt: new Date(),
      lastMessagePreview: preview,
    });

    const recipientRole = this._recipientRole(conversation, senderUserId);
    await this.chatConversationRepository.incrementUnread(conversationId, recipientRole);

    return this._formatMessage(populated);
  }

  async sendAttachmentMessage(conversationId, senderUserId, file, caption) {
    if (!file) throw new BadRequestError('File is required');

    const conversation = await this.verifyConversationAccess(conversationId, senderUserId);
    if (!conversation) throw new ForbiddenError('Access denied');

    const convDir = path.join(process.cwd(), config.storage.chatUploadDir, conversationId);
    fs.mkdirSync(convDir, { recursive: true });
    const relativePath = path.join(conversationId, file.filename);
    const destPath = path.join(process.cwd(), config.storage.chatUploadDir, relativePath);

    if (file.path !== destPath) {
      fs.renameSync(file.path, destPath);
    }

    const message = await this.chatMessageRepository.create({
      conversationId,
      senderUserId,
      content: caption?.trim() || file.originalname,
      messageType: ChatMessageType.ATTACHMENT,
      attachment: {
        storedFileName: file.filename,
        originalFileName: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        relativePath: relativePath.replace(/\\/g, '/'),
      },
    });

    const populated = await this.chatMessageRepository.findById(message._id);
    const preview = `📎 ${file.originalname}`;

    await this.chatConversationRepository.updateById(conversationId, {
      lastMessageAt: new Date(),
      lastMessagePreview: preview,
    });

    const recipientRole = this._recipientRole(conversation, senderUserId);
    await this.chatConversationRepository.incrementUnread(conversationId, recipientRole);

    return this._formatMessage(populated);
  }

  async markAsRead(conversationId, readerUserId, messageId) {
    const conversation = await this.verifyConversationAccess(conversationId, readerUserId);
    if (!conversation) throw new ForbiddenError('Access denied');

    const updated = await this.chatMessageRepository.markReadUpTo(conversationId, readerUserId, messageId);

    const doctorId = conversation.doctorUserId?._id?.toString() || conversation.doctorUserId?.toString();
    const forRole = readerUserId === doctorId ? 'DOCTOR' : 'PATIENT';
    await this.chatConversationRepository.resetUnread(conversationId, forRole);

    return {
      conversationId,
      readerUserId,
      messageId: messageId || null,
      readMessages: updated.map((m) => this._formatMessage(m)),
    };
  }

  async markDelivered(messageId, userId) {
    const message = await this.chatMessageRepository.markDelivered(messageId, userId);
    if (!message) return null;

    const conversation = await this.verifyConversationAccess(message.conversationId.toString(), userId);
    if (!conversation) return null;

    return this._formatMessage(message);
  }

  async downloadAttachment(messageId, requestedBy) {
    const message = await this.chatMessageRepository.findById(messageId);
    if (!message || !message.isActive || message.messageType !== ChatMessageType.ATTACHMENT) {
      throw new NotFoundError('Attachment not found');
    }

    const conversation = await this.verifyConversationAccess(
      message.conversationId.toString(),
      requestedBy.id,
    );
    if (!conversation && !this._isAdmin(requestedBy)) {
      throw new ForbiddenError('Access denied');
    }

    const filePath = path.resolve(process.cwd(), config.storage.chatUploadDir, message.attachment.relativePath);
    if (!fs.existsSync(filePath)) throw new NotFoundError('File not found on server');

    return {
      buffer: fs.readFileSync(filePath),
      originalFileName: message.attachment.originalFileName,
      mimeType: message.attachment.mimeType,
    };
  }
}

module.exports = ChatService;

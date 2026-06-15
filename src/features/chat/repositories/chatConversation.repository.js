const ChatConversation = require('../models/chatConversation.model');

class ChatConversationRepository {
  findById(id) {
    return ChatConversation.findById(id)
      .populate('doctorUserId', 'firstName lastName email role')
      .populate('patientUserId', 'firstName lastName email role')
      .populate('appointmentId', 'scheduledDate status');
  }

  findByParticipants(doctorUserId, patientUserId) {
    return ChatConversation.findOne({ doctorUserId, patientUserId, isActive: true })
      .populate('doctorUserId', 'firstName lastName email role')
      .populate('patientUserId', 'firstName lastName email role');
  }

  create(data) {
    return ChatConversation.create(data);
  }

  async findForUser(userId, { page = 1, limit = 20 } = {}) {
    const filter = {
      isActive: true,
      $or: [{ doctorUserId: userId }, { patientUserId: userId }],
    };
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      ChatConversation.find(filter)
        .sort({ lastMessageAt: -1, updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('doctorUserId', 'firstName lastName email role')
        .populate('patientUserId', 'firstName lastName email role')
        .populate('appointmentId', 'scheduledDate status'),
      ChatConversation.countDocuments(filter),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) || 1 };
  }

  updateById(id, update) {
    return ChatConversation.findByIdAndUpdate(id, update, { new: true })
      .populate('doctorUserId', 'firstName lastName email role')
      .populate('patientUserId', 'firstName lastName email role');
  }

  incrementUnread(conversationId, forRole) {
    const field = forRole === 'DOCTOR' ? 'doctorUnreadCount' : 'patientUnreadCount';
    return ChatConversation.findByIdAndUpdate(
      conversationId,
      { $inc: { [field]: 1 } },
      { new: true },
    );
  }

  resetUnread(conversationId, forRole) {
    const field = forRole === 'DOCTOR' ? 'doctorUnreadCount' : 'patientUnreadCount';
    return ChatConversation.findByIdAndUpdate(conversationId, { [field]: 0 }, { new: true });
  }
}

module.exports = ChatConversationRepository;

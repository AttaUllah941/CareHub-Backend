const ChatMessage = require('../models/chatMessage.model');

class ChatMessageRepository {
  findById(id) {
    return ChatMessage.findById(id).populate('senderUserId', 'firstName lastName email role');
  }

  create(data) {
    return ChatMessage.create(data);
  }

  async findByConversation(conversationId, { page = 1, limit = 50, before } = {}) {
    const filter = { conversationId, isActive: true };
    if (before) filter.createdAt = { $lt: new Date(before) };

    const skip = before ? 0 : (page - 1) * limit;
    const [items, total] = await Promise.all([
      ChatMessage.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('senderUserId', 'firstName lastName email role'),
      ChatMessage.countDocuments({ conversationId, isActive: true }),
    ]);

    return {
      items: items.reverse(),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  markDelivered(messageId, userId) {
    return ChatMessage.findOneAndUpdate(
      { _id: messageId, 'deliveredTo.userId': { $ne: userId } },
      { $push: { deliveredTo: { userId, deliveredAt: new Date() } } },
      { new: true },
    ).populate('senderUserId', 'firstName lastName email role');
  }

  async markReadUpTo(conversationId, readerUserId, messageId) {
    const filter = {
      conversationId,
      senderUserId: { $ne: readerUserId },
      isActive: true,
      'readBy.userId': { $ne: readerUserId },
    };
    if (messageId) filter._id = { $lte: messageId };

    await ChatMessage.updateMany(filter, {
      $push: { readBy: { userId: readerUserId, readAt: new Date() } },
    });

    return ChatMessage.find({
      conversationId,
      senderUserId: { $ne: readerUserId },
      'readBy.userId': readerUserId,
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('senderUserId', 'firstName lastName email role');
  }
}

module.exports = ChatMessageRepository;

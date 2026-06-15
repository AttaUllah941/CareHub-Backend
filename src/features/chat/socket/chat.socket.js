const logger = require('../../../core/utils/logger');
const { getSocketIo } = require('../../../config/socketRegistry');

/**
 * Registers Socket.IO handlers for real-time doctor-patient chat.
 */
function registerChatHandlers(io, chatService) {
  const typingTimers = new Map();

  io.on('connection', (socket) => {
    socket.on('chat:join', async (payload, callback) => {
      try {
        const { conversationId } = payload || {};
        if (!conversationId) throw new Error('conversationId required');

        const conversation = await chatService.verifyConversationAccess(conversationId, socket.userId);
        if (!conversation) throw new Error('Access denied');

        const room = `chat:${conversationId}`;
        socket.join(room);
        socket.chatConversationId = conversationId;

        if (typeof callback === 'function') {
          callback({ success: true, conversationId, userId: socket.userId });
        }
      } catch (err) {
        logger.warn(`chat:join error: ${err.message}`);
        if (typeof callback === 'function') callback({ success: false, error: err.message });
      }
    });

    socket.on('chat:leave', (payload) => {
      const conversationId = payload?.conversationId || socket.chatConversationId;
      if (!conversationId) return;
      socket.leave(`chat:${conversationId}`);
      socket.chatConversationId = null;
    });

    socket.on('chat:send', async (payload, callback) => {
      try {
        const { conversationId, content } = payload || {};
        if (!conversationId || !content?.trim()) throw new Error('conversationId and content required');

        const message = await chatService.sendTextMessage(conversationId, socket.userId, content);
        const room = `chat:${conversationId}`;

        io.to(room).emit('chat:message', { message });
        notifyOfflineParticipant(io, chatService, conversationId, socket.userId, message);

        if (typeof callback === 'function') callback({ success: true, message });
      } catch (err) {
        logger.warn(`chat:send error: ${err.message}`);
        if (typeof callback === 'function') callback({ success: false, error: err.message });
      }
    });

    socket.on('chat:typing', async (payload) => {
      try {
        const { conversationId, isTyping } = payload || {};
        if (!conversationId) return;

        const conversation = await chatService.verifyConversationAccess(conversationId, socket.userId);
        if (!conversation) return;

        const key = `${conversationId}:${socket.userId}`;
        if (typingTimers.has(key)) clearTimeout(typingTimers.get(key));

        socket.to(`chat:${conversationId}`).emit('chat:typing', {
          conversationId,
          userId: socket.userId,
          isTyping: !!isTyping,
        });

        if (isTyping) {
          typingTimers.set(
            key,
            setTimeout(() => {
              socket.to(`chat:${conversationId}`).emit('chat:typing', {
                conversationId,
                userId: socket.userId,
                isTyping: false,
              });
              typingTimers.delete(key);
            }, 3000),
          );
        }
      } catch (err) {
        logger.warn(`chat:typing error: ${err.message}`);
      }
    });

    socket.on('chat:read', async (payload) => {
      try {
        const { conversationId, messageId } = payload || {};
        if (!conversationId) return;

        const result = await chatService.markAsRead(conversationId, socket.userId, messageId);
        socket.to(`chat:${conversationId}`).emit('chat:read-receipt', {
          conversationId,
          readerUserId: socket.userId,
          messageId: messageId || null,
          readAt: new Date().toISOString(),
        });
      } catch (err) {
        logger.warn(`chat:read error: ${err.message}`);
      }
    });

    socket.on('chat:delivered', async (payload) => {
      try {
        const { messageId } = payload || {};
        if (!messageId) return;

        const message = await chatService.markDelivered(messageId, socket.userId);
        if (!message) return;

        const senderUserId = message.senderUserId?.id || message.senderUserId;
        io.to(`user:${senderUserId}`).emit('chat:delivered-receipt', {
          messageId,
          deliveredToUserId: socket.userId,
          deliveredAt: new Date().toISOString(),
        });
      } catch (err) {
        logger.warn(`chat:delivered error: ${err.message}`);
      }
    });

    socket.on('disconnect', () => {
      if (socket.chatConversationId) {
        socket.to(`chat:${socket.chatConversationId}`).emit('chat:typing', {
          conversationId: socket.chatConversationId,
          userId: socket.userId,
          isTyping: false,
        });
      }
    });
  });
}

async function notifyOfflineParticipant(io, chatService, conversationId, senderUserId, message) {
  const conversation = await chatService.verifyConversationAccess(conversationId, senderUserId);
  if (!conversation) return;

  const doctorId = conversation.doctorUserId?._id?.toString() || conversation.doctorUserId?.toString();
  const patientId = conversation.patientUserId?._id?.toString() || conversation.patientUserId?.toString();
  const recipientId = senderUserId === doctorId ? patientId : doctorId;

  const room = `chat:${conversationId}`;
  const sockets = await io.in(room).fetchSockets();
  const recipientInRoom = sockets.some((s) => s.userId === recipientId);

  if (!recipientInRoom) {
    io.to(`user:${recipientId}`).emit('chat:message', { message, conversationId });
  }
}

module.exports = { registerChatHandlers };

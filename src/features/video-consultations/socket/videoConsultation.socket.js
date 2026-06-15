const logger = require('../../../core/utils/logger');

/**
 * Registers Socket.IO handlers for WebRTC signaling, chat, and media state.
 */
function registerVideoConsultationHandlers(io, videoConsultationService) {
  io.on('connection', (socket) => {
    socket.on('video:join', async (payload, callback) => {
      try {
        const { sessionId } = payload || {};
        if (!sessionId) throw new Error('sessionId required');

        const allowed = await videoConsultationService.verifySessionAccess(sessionId, socket.userId);
        if (!allowed) throw new Error('Access denied');

        const room = `video:${sessionId}`;
        socket.join(room);
        socket.videoSessionId = sessionId;

        const peers = await io.in(room).fetchSockets();
        const peerIds = peers
          .filter((s) => s.id !== socket.id && s.userId)
          .map((s) => ({ socketId: s.id, userId: s.userId }));

        socket.to(room).emit('video:user-joined', { userId: socket.userId, socketId: socket.id });

        if (typeof callback === 'function') {
          callback({ success: true, peers, userId: socket.userId });
        }
      } catch (err) {
        logger.warn(`video:join error: ${err.message}`);
        if (typeof callback === 'function') callback({ success: false, error: err.message });
      }
    });

    socket.on('video:signal', async (payload) => {
      try {
        const { sessionId, type, data, targetSocketId } = payload || {};
        if (!sessionId || !type) return;

        const allowed = await videoConsultationService.verifySessionAccess(sessionId, socket.userId);
        if (!allowed) return;

        const room = `video:${sessionId}`;
        const outgoing = {
          type,
          data,
          fromUserId: socket.userId,
          fromSocketId: socket.id,
        };

        if (targetSocketId) {
          io.to(targetSocketId).emit('video:signal', outgoing);
        } else {
          socket.to(room).emit('video:signal', outgoing);
        }
      } catch (err) {
        logger.warn(`video:signal error: ${err.message}`);
      }
    });

    socket.on('video:chat', async (payload) => {
      try {
        const { sessionId, message } = payload || {};
        if (!sessionId || !message?.trim()) return;

        const saved = await videoConsultationService.saveChatMessage(
          sessionId,
          socket.userId,
          message,
        );

        io.to(`video:${sessionId}`).emit('video:chat', {
          message: saved,
        });
      } catch (err) {
        logger.warn(`video:chat error: ${err.message}`);
      }
    });

    socket.on('video:media-state', async (payload) => {
      try {
        const { sessionId, audioEnabled, videoEnabled, screenSharing } = payload || {};
        if (!sessionId) return;

        await videoConsultationService.updateMediaState(sessionId, socket.userId, {
          audioEnabled,
          videoEnabled,
          screenSharing,
        });

        socket.to(`video:${sessionId}`).emit('video:media-state', {
          userId: socket.userId,
          audioEnabled,
          videoEnabled,
          screenSharing,
        });
      } catch (err) {
        logger.warn(`video:media-state error: ${err.message}`);
      }
    });

    socket.on('video:leave', (payload) => {
      const sessionId = payload?.sessionId || socket.videoSessionId;
      if (!sessionId) return;
      socket.leave(`video:${sessionId}`);
      socket.to(`video:${sessionId}`).emit('video:user-left', { userId: socket.userId });
      socket.videoSessionId = null;
    });

    socket.on('disconnect', () => {
      if (socket.videoSessionId) {
        socket.to(`video:${socket.videoSessionId}`).emit('video:user-left', {
          userId: socket.userId,
        });
      }
    });
  });
}

module.exports = { registerVideoConsultationHandlers };

const { Server } = require('socket.io');
const logger = require('../core/utils/logger');
const { verifyAccessToken } = require('../core/utils/token.utils');
const { setSocketIo } = require('./socketRegistry');
const container = require('../core/container');
const { registerVideoConsultationHandlers } = require('../features/video-consultations/socket/videoConsultation.socket');
const { registerChatHandlers } = require('../features/chat/socket/chat.socket');

/**
 * Initializes Socket.IO for real-time features including push notifications.
 */
const initializeSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN || 'http://localhost:4200',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }
    try {
      const decoded = verifyAccessToken(token);
      socket.userId = decoded.sub;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    if (socket.userId) {
      socket.join(`user:${socket.userId}`);
      logger.debug(`Socket ${socket.id} joined user:${socket.userId}`);
    }

    socket.on('disconnect', () => {
      logger.debug(`Socket disconnected: ${socket.id}`);
    });
  });

  setSocketIo(io);

  const videoConsultationService = container.resolve('videoConsultationService');
  registerVideoConsultationHandlers(io, videoConsultationService);

  const chatService = container.resolve('chatService');
  registerChatHandlers(io, chatService);

  return io;
};

module.exports = { initializeSocket };

const { Server } = require('socket.io');
const config = require('../config');
const logger = require('../core/utils/logger');
const { verifyAccessToken } = require('../core/utils/token.utils');
const registerVideoConsultNamespace = require('./video-consult.socket');

let io = null;

const resolveSocketCorsOrigin = (origin, callback) => {
  if (!origin) {
    return callback(null, true);
  }

  if (config.cors.allowedOrigins.includes(origin)) {
    return callback(null, true);
  }

  if (!config.isProduction && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
    return callback(null, true);
  }

  if (
    process.env.CORS_ALLOW_NETLIFY === 'true' &&
    /^https:\/\/([a-z0-9-]+--)?[a-z0-9-]+\.netlify\.app$/i.test(origin)
  ) {
    return callback(null, true);
  }

  return callback(new Error(`Origin ${origin} not allowed by CORS`));
};

const authenticateSocket = (socket, next) => {
  try {
    const rawAuth = socket.handshake.auth?.token || socket.handshake.query?.token;
    const headerAuth = socket.handshake.headers?.authorization;
    const token = rawAuth || (headerAuth?.startsWith('Bearer ') ? headerAuth.slice(7) : null);

    if (!token) {
      return next(new Error('Authentication required'));
    }

    const decoded = verifyAccessToken(token);
    socket.user = { id: decoded.sub, role: decoded.role };
    return next();
  } catch {
    return next(new Error('Invalid or expired token'));
  }
};

/**
 * Attaches Socket.io to the existing HTTP server with JWT handshake auth.
 */
const initSockets = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: resolveSocketCorsOrigin,
      credentials: true,
    },
  });

  io.use(authenticateSocket);
  registerVideoConsultNamespace(io);

  logger.info('Socket.io initialized');
  return io;
};

const getIO = () => io;

const closeSockets = () =>
  new Promise((resolve) => {
    if (!io) {
      resolve();
      return;
    }

    io.close(() => {
      io = null;
      resolve();
    });
  });

module.exports = {
  initSockets,
  getIO,
  closeSockets,
};

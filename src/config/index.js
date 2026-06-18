require('dotenv').config();

/**
 * Centralized application configuration.
 * All env vars are validated at startup to fail fast in production.
 */
const config = Object.freeze({
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 5800,
  apiPrefix: process.env.API_PREFIX || '/api/v1',
  isProduction: process.env.NODE_ENV === 'production',

  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/carehub',
    maxPoolSize: parseInt(process.env.MONGODB_POOL_SIZE, 10) || 50,
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'dev-jwt-secret-change-me',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-me',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },

  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:4200',
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
  },

  bcrypt: {
    saltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 12,
  },

  frontend: {
    url: process.env.FRONTEND_URL || 'http://localhost:4200',
  },

  passwordReset: {
    expiresInMs: parseInt(process.env.PASSWORD_RESET_EXPIRES_MS, 10) || 60 * 60 * 1000,
  },

  storage: {
    provider: process.env.STORAGE_PROVIDER || 'local',
    uploadDir: process.env.UPLOAD_DIR || 'uploads/medical-records',
    pharmacyUploadDir: process.env.PHARMACY_UPLOAD_DIR || 'uploads/pharmacy-prescriptions',
    labReportUploadDir: process.env.LAB_REPORT_UPLOAD_DIR || 'uploads/lab-reports',
    chatUploadDir: process.env.CHAT_UPLOAD_DIR || 'uploads/chat-attachments',
    maxFileSizeMb: parseInt(process.env.MAX_UPLOAD_MB, 10) || 25,
    allowedMimeTypes: [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'application/dicom',
      'application/octet-stream',
    ],
  },

  payments: {
    jazzcash: {
      merchantId: process.env.JAZZCASH_MERCHANT_ID || '',
      password: process.env.JAZZCASH_PASSWORD || '',
      integritySalt: process.env.JAZZCASH_INTEGRITY_SALT || '',
      returnUrl: process.env.JAZZCASH_RETURN_URL || '',
      apiUrl: process.env.JAZZCASH_API_URL || 'https://sandbox.jazzcash.com.pk/ApplicationAPI/API/2.0/Purchase/DoMWalletTransaction',
      sandbox: process.env.JAZZCASH_SANDBOX !== 'false',
    },
    easypaisa: {
      storeId: process.env.EASYPAISA_STORE_ID || '',
      hashKey: process.env.EASYPAISA_HASH_KEY || '',
      returnUrl: process.env.EASYPAISA_RETURN_URL || '',
      apiUrl: process.env.EASYPAISA_API_URL || 'https://easypay.easypaisa.com.pk/easypay-service/rest/v4/initiate-ma-transaction',
      sandbox: process.env.EASYPAISA_SANDBOX !== 'false',
    },
  },

  webrtc: {
    iceServers: [
      { urls: process.env.WEBRTC_STUN_URL || 'stun:stun.l.google.com:19302' },
      ...(process.env.WEBRTC_TURN_URL
        ? [
            {
              urls: process.env.WEBRTC_TURN_URL,
              username: process.env.WEBRTC_TURN_USERNAME || '',
              credential: process.env.WEBRTC_TURN_CREDENTIAL || '',
            },
          ]
        : []),
    ],
  },
});

module.exports = config;

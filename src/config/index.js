require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';

/** Comma-separated list, e.g. http://localhost:4200,https://app.netlify.app */
const parseCorsOrigins = (value) => {
  if (!value) return ['http://localhost:4200'];
  return value.split(',').map((entry) => entry.trim()).filter(Boolean);
};

const isLocalhostOrigin = (origin) =>
  /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

/** Netlify production + deploy-preview / branch deploys */
const isNetlifyOrigin = (origin) =>
  /^https:\/\/([a-z0-9-]+--)?[a-z0-9-]+\.netlify\.app$/i.test(origin);

/**
 * CORS origin callback — in development, any localhost port is allowed
 * (Angular dev-server / SSR may use ports other than 4200).
 */
const resolveCorsOrigin = (origin, callback) => {
  if (!origin) {
    return callback(null, true);
  }

  const allowedOrigins = parseCorsOrigins(process.env.CORS_ORIGIN);

  if (allowedOrigins.includes(origin)) {
    return callback(null, true);
  }

  if (!isProduction && isLocalhostOrigin(origin)) {
    return callback(null, true);
  }

  // Optional: allow all *.netlify.app while FRONTEND_URL is being finalized
  if (process.env.CORS_ALLOW_NETLIFY === 'true' && isNetlifyOrigin(origin)) {
    return callback(null, true);
  }

  return callback(new Error(`Origin ${origin} not allowed by CORS`));
};

/**
 * Centralized application configuration.
 * Validate required secrets in production before scaling out.
 */
const config = Object.freeze({
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 5800,
  apiPrefix: process.env.API_PREFIX || '/api/v1',
  isProduction,

  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/carehub',
    maxPoolSize: parseInt(process.env.MONGODB_POOL_SIZE, 10) || 50,
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'dev-jwt-secret-change-me',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-me',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },

  cors: {
    allowedOrigins: parseCorsOrigins(process.env.CORS_ORIGIN),
    origin: resolveCorsOrigin,
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
    provider: process.env.STORAGE_PROVIDER || 'cloudinary',
    uploadDir: process.env.UPLOAD_DIR || 'uploads',
    maxFileSizeMb: parseInt(process.env.MAX_UPLOAD_MB, 10) || 5,
  },

  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
    folder: process.env.CLOUDINARY_FOLDER || 'carehub',
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
    enabled: process.env.REDIS_ENABLED !== 'false',
  },

  smtp: {
    host: process.env.SMTP_HOST || '',
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'CareHub <noreply@carehub.local>',
  },
});

if (isProduction) {
  const missing = [];
  if (!process.env.JWT_SECRET) missing.push('JWT_SECRET');
  if (!process.env.JWT_REFRESH_SECRET) missing.push('JWT_REFRESH_SECRET');
  if (!process.env.MONGODB_URI) missing.push('MONGODB_URI');
  if (!process.env.CORS_ORIGIN && process.env.CORS_ALLOW_NETLIFY !== 'true') {
    missing.push('CORS_ORIGIN (or set CORS_ALLOW_NETLIFY=true)');
  }
  if (!process.env.FRONTEND_URL && process.env.CORS_ALLOW_NETLIFY !== 'true') {
    missing.push('FRONTEND_URL (or set CORS_ALLOW_NETLIFY=true)');
  }

  if (config.storage.provider === 'cloudinary') {
    if (!process.env.CLOUDINARY_CLOUD_NAME) missing.push('CLOUDINARY_CLOUD_NAME');
    if (!process.env.CLOUDINARY_API_KEY) missing.push('CLOUDINARY_API_KEY');
    if (!process.env.CLOUDINARY_API_SECRET) missing.push('CLOUDINARY_API_SECRET');
  }

  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  if (
    process.env.JWT_SECRET === 'dev-jwt-secret-change-me' ||
    process.env.JWT_SECRET === 'your-super-secret-jwt-key-change-in-production'
  ) {
    throw new Error('JWT_SECRET must be changed for production');
  }
}

module.exports = config;

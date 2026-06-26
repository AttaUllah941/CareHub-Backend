require('dotenv').config();

const { cleanEnv, str, port, num } = require('envalid');

const env = cleanEnv(process.env, {
  NODE_ENV: str({
    choices: ['development', 'production', 'test'],
    default: 'development',
  }),
  PORT: port({ default: 5800 }),
  MONGODB_URI: str({ devDefault: 'mongodb://localhost:27017/carehub' }),
  JWT_ACCESS_SECRET: str({ devDefault: 'dev-access-secret-change-me' }),
  JWT_REFRESH_SECRET: str({ devDefault: 'dev-refresh-secret-change-me' }),
  JWT_ACCESS_EXPIRES_IN: str({ default: '15m' }),
  JWT_REFRESH_EXPIRES_IN: str({ default: '7d' }),
  BCRYPT_SALT_ROUNDS: num({ default: 12 }),
  PASSWORD_RESET_EXPIRES_MS: num({ default: 60 * 60 * 1000 }),
  CORS_ORIGIN: str({ default: 'http://localhost:4200' }),
  FRONTEND_URL: str({ default: 'http://localhost:4200' }),
  REDIS_URL: str({ default: '' }),
  SMTP_HOST: str({ default: '' }),
  SMTP_PORT: num({ default: 587 }),
  SMTP_USER: str({ default: '' }),
  SMTP_PASS: str({ default: '' }),
  AWS_ACCESS_KEY_ID: str({ default: '' }),
  AWS_SECRET_ACCESS_KEY: str({ default: '' }),
  AWS_S3_BUCKET: str({ default: '' }),
  AWS_REGION: str({ default: '' }),
});

const parseCorsOrigins = (value) =>
  value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

const isProduction = env.NODE_ENV === 'production';

const isLocalhostOrigin = (origin) =>
  /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

/**
 * CORS origin callback — in development, any localhost port is allowed.
 */
const resolveCorsOrigin = (origin, callback) => {
  if (!origin) {
    return callback(null, true);
  }

  const allowedOrigins = parseCorsOrigins(env.CORS_ORIGIN);

  if (allowedOrigins.includes(origin)) {
    return callback(null, true);
  }

  if (!isProduction && isLocalhostOrigin(origin)) {
    return callback(null, true);
  }

  return callback(new Error(`Origin ${origin} not allowed by CORS`));
};

module.exports = {
  ...env,
  isProduction,
  apiPrefix: '/api/v1',
  cors: {
    allowedOrigins: parseCorsOrigins(env.CORS_ORIGIN),
    origin: resolveCorsOrigin,
  },
};

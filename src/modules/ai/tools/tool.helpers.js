const { z } = require('zod');
const { BadRequestError } = require('../../../core/errors/AppError');

/**
 * Shared argument building blocks. Every value the model supplies is untrusted input:
 * strings are length-bounded and city names are restricted to letters because some existing
 * list services build a case-insensitive RegExp from them.
 */
const citySchema = z
  .string()
  .trim()
  .min(2)
  .max(60)
  .regex(/^[\p{L}][\p{L} .'-]*$/u, 'City must contain letters only');

const searchTextSchema = z.string().trim().min(1).max(100);

const objectId = (label = 'id') =>
  z
    .string()
    .trim()
    .regex(/^[a-fA-F0-9]{24}$/, `Invalid ${label}`);

const dateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the YYYY-MM-DD format');

const limitSchema = (max = 8, fallback = 5) =>
  z.number().int().min(1).max(max).optional().describe(`Maximum results (default ${fallback}, max ${max})`);

const pkr = (amount, currency = 'PKR') =>
  `${currency === 'PKR' ? 'Rs' : currency} ${Number(amount ?? 0).toLocaleString('en-PK')}`;

const truncate = (text, max = 400) => {
  const value = String(text ?? '').trim();
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
};

const formatDateTime = (iso) =>
  new Date(iso).toLocaleString('en-PK', {
    timeZone: 'Asia/Karachi',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

const formatDate = (dateString) =>
  new Date(`${dateString}T12:00:00+05:00`).toLocaleDateString('en-PK', {
    timeZone: 'Asia/Karachi',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

/** Normalises "9:00 am" / "09:00 AM" to the canonical "09:00 AM" label used by slots. */
const normalizeTimeLabel = (value) => {
  const match = String(value ?? '')
    .trim()
    .match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;
  return `${match[1].padStart(2, '0')}:${match[2]} ${match[3].toUpperCase()}`;
};

/** Converts a zod failure into a message the model can relay to the user. */
const throwValidation = (zodError) => {
  const issues = (zodError.issues || []).map((issue) => {
    const field = issue.path.join('.');
    return field ? `${field}: ${issue.message}` : issue.message;
  });
  throw new BadRequestError(issues.join('; ') || 'Invalid details');
};

const parseOrThrow = (schema, value) => {
  const result = schema.safeParse(value);
  if (!result.success) throwValidation(result.error);
  return result.data;
};

module.exports = {
  citySchema,
  searchTextSchema,
  objectId,
  dateSchema,
  limitSchema,
  pkr,
  truncate,
  formatDateTime,
  formatDate,
  normalizeTimeLabel,
  parseOrThrow,
};

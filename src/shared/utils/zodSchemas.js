const mongoose = require('mongoose');
const { z } = require('zod');

const objectIdSchema = (label = 'id') =>
  z.string().refine((value) => mongoose.Types.ObjectId.isValid(value), {
    message: `Invalid ${label}`,
  });

const phoneSchema = z
  .string()
  .trim()
  .refine((value) => {
    const digits = value.replace(/\D/g, '');
    if (/^[0-9]{10,11}$/.test(digits)) {
      return true;
    }
    return /^\+?[1-9]\d{7,14}$/.test(value);
  }, 'Invalid phone number');

const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).optional(),
  sortBy: z.string().trim().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

module.exports = {
  objectIdSchema,
  phoneSchema,
  paginationQuerySchema,
};

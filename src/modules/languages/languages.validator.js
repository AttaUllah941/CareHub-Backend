const { z } = require('zod');

const createLanguageSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  code: z
    .string()
    .trim()
    .min(2, 'Code must be at least 2 characters')
    .max(10)
    .regex(/^[a-zA-Z-]+$/, 'Code must contain only letters and hyphens'),
});

const updateLanguageSchema = z
  .object({
    name: z.string().trim().min(2).max(100).optional(),
    code: z
      .string()
      .trim()
      .min(2)
      .max(10)
      .regex(/^[a-zA-Z-]+$/, 'Code must contain only letters and hyphens')
      .optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required',
  });

module.exports = {
  createLanguageSchema,
  updateLanguageSchema,
};

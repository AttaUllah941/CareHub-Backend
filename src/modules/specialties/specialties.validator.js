const { z } = require('zod');

const createSpecialtySchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(150),
  slug: z.string().trim().min(2).max(150).optional(),
  description: z.string().trim().max(1000).optional(),
  icon: z.string().trim().max(50).optional(),
});

const updateSpecialtySchema = z
  .object({
    name: z.string().trim().min(2).max(150).optional(),
    slug: z.string().trim().min(2).max(150).optional(),
    description: z.string().trim().max(1000).optional(),
    icon: z.string().trim().max(50).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required',
  });

module.exports = {
  createSpecialtySchema,
  updateSpecialtySchema,
};

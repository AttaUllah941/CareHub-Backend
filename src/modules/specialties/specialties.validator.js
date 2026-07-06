const { z } = require('zod');

const specialtySlugParamsSchema = z.object({
  slug: z.string().trim().min(2).max(100),
});

module.exports = {
  specialtySlugParamsSchema,
};

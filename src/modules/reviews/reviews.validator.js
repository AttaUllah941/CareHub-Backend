const { z } = require('zod');
const { objectIdSchema } = require('../../shared/utils/zodSchemas');

const reviewBodySchema = z.object({
  rating: z.number().int().min(1).max(5),
  headline: z.string().trim().min(3).max(200),
  body: z.string().trim().min(10).max(5000),
  tags: z.array(z.string().trim().min(1).max(50)).max(10).optional(),
});

const createReviewParamsSchema = z.object({ doctorId: objectIdSchema('doctorId') });
const reviewIdParamsSchema = z.object({ id: objectIdSchema('review id') });

module.exports = {
  reviewBodySchema,
  createReviewParamsSchema,
  reviewIdParamsSchema,
};

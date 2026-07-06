const { z } = require('zod');
const { objectIdSchema, paginationQuerySchema } = require('../../shared/utils/zodSchemas');

const searchPublicQuerySchema = paginationQuerySchema.extend({
  city: z.string().trim().optional(),
  specialtySlug: z.string().trim().optional(),
  search: z.string().trim().optional(),
  name: z.string().trim().optional(),
  maxFee: z.coerce.number().positive().optional(),
  minFee: z.coerce.number().positive().optional(),
});

const publicDoctorIdParamsSchema = z.object({
  id: objectIdSchema('id'),
});

module.exports = {
  searchPublicQuerySchema,
  publicDoctorIdParamsSchema,
};

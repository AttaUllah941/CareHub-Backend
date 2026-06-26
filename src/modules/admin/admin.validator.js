const { z } = require('zod');
const { USER_ROLES } = require('../../shared/enums/userRole.enum');
const { objectIdSchema, paginationQuerySchema } = require('../../shared/utils/zodSchemas');

const listUsersQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().min(1).max(100).optional(),
  role: z.enum(USER_ROLES).optional(),
  isActive: z.enum(['true', 'false']).optional(),
});

const updateUserStatusParamsSchema = z.object({
  id: objectIdSchema('user id'),
});

const updateUserStatusBodySchema = z.object({
  isActive: z.boolean(),
});

module.exports = {
  listUsersQuerySchema,
  updateUserStatusParamsSchema,
  updateUserStatusBodySchema,
};

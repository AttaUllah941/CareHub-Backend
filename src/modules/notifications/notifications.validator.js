const { z } = require('zod');
const { objectIdSchema, paginationQuerySchema } = require('../../shared/utils/zodSchemas');

const listMyNotificationsSchema = paginationQuerySchema.extend({
  unreadOnly: z
    .union([z.literal('true'), z.literal('false'), z.boolean()])
    .optional(),
});

const notificationIdParamSchema = z.object({
  id: objectIdSchema('notification id'),
});

module.exports = {
  listMyNotificationsSchema,
  notificationIdParamSchema,
};

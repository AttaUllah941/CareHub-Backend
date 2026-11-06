const { z } = require('zod');
const config = require('../../../config');
const { objectIdSchema, paginationQuerySchema } = require('../../../shared/utils/zodSchemas');

/**
 * strict(): unknown keys (for example a client-supplied "role" or "agent") are rejected, so there
 * is no input channel through which a caller could influence agent selection or permissions.
 */
const chatSchema = z
  .object({
    message: z.string().trim().min(1, 'Message is required').max(config.ai.maxMessageChars),
    conversationId: objectIdSchema('conversationId').nullable().optional(),
  })
  .strict();

const conversationIdParamsSchema = z.object({ id: objectIdSchema('conversation id') });
const actionIdParamsSchema = z.object({ id: objectIdSchema('action id') });
const listConversationsQuerySchema = paginationQuerySchema;

module.exports = {
  chatSchema,
  conversationIdParamsSchema,
  actionIdParamsSchema,
  listConversationsQuerySchema,
};

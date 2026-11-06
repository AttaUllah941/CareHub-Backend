const { Router } = require('express');
const { authenticate } = require('../../core/middleware/auth.middleware');
const { validate } = require('../../shared/middleware/validate.middleware');
const { aiChatLimiter, aiActionLimiter } = require('../../shared/middleware/rateLimit.middleware');
const aiController = require('./ai.controller');
const {
  chatSchema,
  conversationIdParamsSchema,
  actionIdParamsSchema,
  listConversationsQuerySchema,
} = require('./validators/chat.validator');

const router = Router();

// Every AI route requires a verified user; the agent is derived from that identity only.
router.use(authenticate);

/**
 * @openapi
 * /ai/capabilities:
 *   get:
 *     tags: [AI]
 *     summary: Agent, tools and suggested prompts available to the signed-in user
 *     security: [{ bearerAuth: [] }]
 */
router.get('/capabilities', aiController.capabilities);

/**
 * @openapi
 * /ai/chat:
 *   post:
 *     tags: [AI]
 *     summary: Send a message to the assistant for the signed-in user's role
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [message]
 *             properties:
 *               message: { type: string, maxLength: 2000 }
 *               conversationId: { type: string, nullable: true }
 */
router.post('/chat', aiChatLimiter, validate(chatSchema), aiController.chat);

router.get(
  '/conversations',
  validate(listConversationsQuerySchema, 'query'),
  aiController.listConversations,
);
router.get(
  '/conversations/:id',
  validate(conversationIdParamsSchema, 'params'),
  aiController.getConversation,
);
router.delete(
  '/conversations/:id',
  validate(conversationIdParamsSchema, 'params'),
  aiController.deleteConversation,
);

router.post(
  '/actions/:id/confirm',
  aiActionLimiter,
  validate(actionIdParamsSchema, 'params'),
  aiController.confirmAction,
);
router.post(
  '/actions/:id/cancel',
  aiActionLimiter,
  validate(actionIdParamsSchema, 'params'),
  aiController.cancelAction,
);

module.exports = router;

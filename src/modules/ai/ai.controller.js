const { successResponse } = require('../../core/utils/apiResponse');
const asyncHandler = require('../../core/utils/asyncHandler');
const aiService = require('./services/ai.service');
const pendingActions = require('./services/pending-action.service');
const conversationService = require('./memory/conversation.service');

const chat = asyncHandler(async (req, res) => {
  const data = await aiService.chat({
    user: req.user,
    message: req.body.message,
    conversationId: req.body.conversationId || null,
  });
  successResponse(res, data, 'Reply generated');
});

const capabilities = asyncHandler(async (req, res) => {
  successResponse(res, aiService.getCapabilities(req.user), 'AI capabilities retrieved');
});

const listConversations = asyncHandler(async (req, res) => {
  const data = await conversationService.list(req.user.id, req.query);
  successResponse(res, data, 'Conversations retrieved');
});

const getConversation = asyncHandler(async (req, res) => {
  const data = await conversationService.getWithMessages(req.params.id, req.user.id);
  successResponse(res, data, 'Conversation retrieved');
});

const deleteConversation = asyncHandler(async (req, res) => {
  await conversationService.remove(req.params.id, req.user.id);
  successResponse(res, { deleted: true }, 'Conversation deleted');
});

const confirmAction = asyncHandler(async (req, res) => {
  const data = await pendingActions.confirm(req.params.id, req.user);
  successResponse(res, data, 'Action completed');
});

const cancelAction = asyncHandler(async (req, res) => {
  const data = await pendingActions.cancel(req.params.id, req.user);
  successResponse(res, data, 'Action cancelled');
});

module.exports = {
  chat,
  capabilities,
  listConversations,
  getConversation,
  deleteConversation,
  confirmAction,
  cancelAction,
};

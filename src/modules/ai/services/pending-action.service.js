const mongoose = require('mongoose');
const config = require('../../../config');
const logger = require('../../../core/utils/logger');
const { AppError, BadRequestError, NotFoundError } = require('../../../core/errors/AppError');
const { isOperationalError } = require('./errors');
const { AiPendingAction } = require('../memory/pending-action.model');
const conversationService = require('../memory/conversation.service');
const { getTool } = require('../tools/tool.registry');
const { canUseTool } = require('./permission.service');
const { recordAction } = require('./audit.service');

const toResponse = (doc) => ({
  id: doc._id.toString(),
  tool: doc.tool,
  summary: doc.summary,
  status: doc.status,
  expiresAt: doc.expiresAt.toISOString(),
});

const create = async ({ user, conversation, agent, tool, args, summary }) => {
  // One open proposal at a time per conversation: a new proposal supersedes older ones.
  await AiPendingAction.updateMany(
    { conversationId: conversation._id, status: 'pending' },
    { status: 'cancelled' },
  );

  const doc = await AiPendingAction.create({
    userId: user.id,
    conversationId: conversation._id,
    agent,
    tool,
    args,
    summary,
    expiresAt: new Date(Date.now() + config.ai.confirmationTtlMs),
  });
  return toResponse(doc);
};

const loadOwned = async (id, userId) => {
  if (!mongoose.Types.ObjectId.isValid(id)) throw new NotFoundError('Action not found');
  const doc = await AiPendingAction.findOne({ _id: id, userId });
  if (!doc) throw new NotFoundError('Action not found');
  return doc;
};

/**
 * Executes a confirmed proposal. Safe against double-clicks and replays: the status flips
 * pending -> executing atomically, so only one request can ever run the action.
 */
const confirm = async (id, user) => {
  const existing = await loadOwned(id, user.id);

  if (existing.status === 'pending' && existing.expiresAt <= new Date()) {
    existing.status = 'expired';
    await existing.save();
    throw new BadRequestError('This confirmation has expired. Please ask again.');
  }

  const claimed = await AiPendingAction.findOneAndUpdate(
    { _id: existing._id, userId: user.id, status: 'pending', expiresAt: { $gt: new Date() } },
    { status: 'executing' },
    { new: true },
  );
  if (!claimed) {
    throw new BadRequestError(
      existing.status === 'executed'
        ? 'This action was already completed.'
        : `This action can no longer be confirmed (${existing.status}).`,
    );
  }

  const conversation = await conversationService.getOwned(claimed.conversationId, user.id);
  const tool = getTool(claimed.tool);

  if (!tool || !tool.requiresConfirmation || !canUseTool(user, tool)) {
    claimed.status = 'failed';
    claimed.errorMessage = 'Tool not permitted';
    await claimed.save();
    throw new AppError('This action is not permitted.', 403);
  }

  const ctx = { user: { id: user.id, role: user.role }, conversation };

  try {
    // Stored args are the normalised form produced by prepare(); execute() re-validates them with
    // the existing request schemas (and the service layer re-applies every business rule).
    const args = claimed.args;
    const result = await tool.execute(args, ctx);

    claimed.status = 'executed';
    await claimed.save();
    await recordAction({
      user, agent: claimed.agent, tool: claimed.tool, conversationId: claimed.conversationId,
      pendingActionId: claimed._id, args, outcome: 'success',
    });

    const message = await conversationService.appendMessage({
      conversation,
      role: 'assistant',
      content: result.outcome || 'Done.',
      actions: result.actions || [],
      toolsUsed: [claimed.tool],
    });

    return {
      conversationId: conversation._id.toString(),
      message: conversationService.toMessageResponse(message),
      status: 'executed',
    };
  } catch (error) {
    claimed.status = 'failed';
    claimed.errorMessage = String(error.message).slice(0, 300);
    await claimed.save();
    await recordAction({
      user, agent: claimed.agent, tool: claimed.tool, conversationId: claimed.conversationId,
      pendingActionId: claimed._id, args: claimed.args, outcome: 'failure', error: error.message,
    });

    if (isOperationalError(error)) throw error;
    logger.error(`Confirmed AI action "${claimed.tool}" failed: ${error.stack || error.message}`);
    throw new AppError('The action could not be completed. Please try again.', 500);
  }
};

const cancel = async (id, user) => {
  const doc = await loadOwned(id, user.id);
  if (doc.status !== 'pending') {
    throw new BadRequestError(`This action can no longer be cancelled (${doc.status}).`);
  }
  doc.status = 'cancelled';
  await doc.save();

  const conversation = await conversationService.getOwned(doc.conversationId, user.id);
  const message = await conversationService.appendMessage({
    conversation,
    role: 'assistant',
    content: 'No problem — I cancelled that. Nothing was changed.',
  });

  return {
    conversationId: conversation._id.toString(),
    message: conversationService.toMessageResponse(message),
    status: 'cancelled',
  };
};

module.exports = { create, confirm, cancel };

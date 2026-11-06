const mongoose = require('mongoose');
const config = require('../../../config');
const { NotFoundError } = require('../../../core/errors/AppError');
const { parsePaginationQuery, buildPaginationMeta } = require('../../../core/utils/pagination.util');
const { AiConversation } = require('./conversation.model');
const { AiMessage } = require('./message.model');
const { AiPendingAction } = require('./pending-action.model');

const MAX_STORED_ACTION_CHARS = 12000;

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

const deriveTitle = (text) => {
  const clean = String(text).replace(/\s+/g, ' ').trim();
  if (!clean) return 'New chat';
  return clean.length > 60 ? `${clean.slice(0, 57)}…` : clean;
};

const toMessageResponse = (message) => ({
  id: message._id.toString(),
  role: message.role,
  content: message.content,
  actions: message.actions || [],
  createdAt: message.createdAt?.toISOString(),
});

const toConversationResponse = (conversation) => ({
  id: conversation._id.toString(),
  agent: conversation.agent,
  title: conversation.title,
  lastMessageAt: conversation.lastMessageAt?.toISOString(),
  createdAt: conversation.createdAt?.toISOString(),
});

/** Loads a conversation only when it belongs to the user — otherwise behaves as not found. */
const getOwned = async (id, userId) => {
  if (!isValidId(id)) throw new NotFoundError('Conversation not found');
  const conversation = await AiConversation.findOne({ _id: id, userId });
  if (!conversation) throw new NotFoundError('Conversation not found');
  return conversation;
};

const create = ({ userId, agent, firstMessage }) =>
  AiConversation.create({ userId, agent, title: deriveTitle(firstMessage) });

/** Drops oversized UI payloads so a single reply can't bloat storage. */
const trimActions = (actions = []) =>
  actions.filter((action) => JSON.stringify(action).length <= MAX_STORED_ACTION_CHARS);

const appendMessage = async ({ conversation, role, content, actions = [], toolsUsed = [] }) => {
  const message = await AiMessage.create({
    conversationId: conversation._id,
    userId: conversation.userId,
    role,
    content,
    actions: trimActions(actions),
    toolsUsed,
  });
  await AiConversation.updateOne({ _id: conversation._id }, { lastMessageAt: new Date() });
  return message;
};

/** Plain user/assistant text only — tool payloads are never replayed to the model. */
const getHistoryForModel = async (conversation, limit = config.ai.historyMessages) => {
  const rows = await AiMessage.find({ conversationId: conversation._id })
    .sort({ createdAt: -1 })
    .limit(limit)
    .select('role content')
    .lean();
  return rows.reverse().map((row) => ({ role: row.role, content: row.content }));
};

/** Shallow-merges keys into the conversation's structured working memory. */
const updateContext = async (conversation, patch) => {
  const $set = {};
  for (const [key, value] of Object.entries(patch)) {
    $set[`context.${key}`] = value;
  }
  if (Object.keys($set).length === 0) return;
  await AiConversation.updateOne({ _id: conversation._id }, { $set });
  conversation.context = { ...(conversation.context || {}), ...patch };
};

const list = async (userId, query) => {
  const { page, limit, skip } = parsePaginationQuery(query, ['lastMessageAt']);
  const filter = { userId };
  const [items, total] = await Promise.all([
    AiConversation.find(filter).sort({ lastMessageAt: -1 }).skip(skip).limit(limit).lean(),
    AiConversation.countDocuments(filter),
  ]);
  return {
    conversations: items.map(toConversationResponse),
    pagination: buildPaginationMeta(page, limit, total),
  };
};

const getWithMessages = async (id, userId) => {
  const conversation = await getOwned(id, userId);
  const messages = await AiMessage.find({ conversationId: conversation._id })
    .sort({ createdAt: 1 })
    .limit(200)
    .lean();
  return {
    conversation: toConversationResponse(conversation),
    messages: messages.map(toMessageResponse),
  };
};

const remove = async (id, userId) => {
  const conversation = await getOwned(id, userId);
  await Promise.all([
    AiMessage.deleteMany({ conversationId: conversation._id }),
    AiPendingAction.deleteMany({ conversationId: conversation._id }),
    AiConversation.deleteOne({ _id: conversation._id }),
  ]);
};

module.exports = {
  getOwned,
  create,
  appendMessage,
  getHistoryForModel,
  updateContext,
  list,
  getWithMessages,
  remove,
  toMessageResponse,
};

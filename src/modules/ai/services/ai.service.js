const config = require('../../../config');
const logger = require('../../../core/utils/logger');
const { AppError } = require('../../../core/errors/AppError');
const { isOperationalError } = require('./errors');
const conversationService = require('../memory/conversation.service');
const { getProvider } = require('../providers');
const { resolveAgent } = require('../router/agent.router');
const intentRouter = require('../router/intent.router');
const { getToolsForAgent, toProviderTools } = require('../tools/tool.registry');
const toolExecutor = require('./tool-executor.service');

const MAX_TOOL_CALLS_PER_STEP = 4;
const MAX_ACTIONS_PER_REPLY = 6;
const FALLBACK_REPLY =
  "I wasn't able to finish that request. Could you rephrase it or give me a bit more detail?";

const EMERGENCY_SYSTEM_NOTE =
  'The latest user message may describe a medical emergency. Begin your reply by telling the user to call 1122 or go to the nearest emergency department now, then help with anything else.';

/**
 * Removes control characters and invisible/bidirectional formatting characters that are
 * commonly used to hide instructions, and bounds the length.
 */
const sanitizeMessage = (text) =>
  String(text)
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/[​-‏‪-‮⁦-⁩﻿]/g, '')
    .replace(/\r\n/g, '\n')
    .trim()
    .slice(0, config.ai.maxMessageChars);

/**
 * Runs the model <-> tools loop for one user message.
 * Returns the final text plus UI actions and any working-memory updates.
 */
const runAgentLoop = async ({ agent, user, conversation, history, text, route }) => {
  const provider = getProvider();
  const tools = getToolsForAgent(agent.name, { intents: route.intents });
  const providerTools = toProviderTools(tools);
  const allowedToolNames = new Set(tools.map((tool) => tool.name));

  const messages = [
    { role: 'system', content: agent.buildSystemPrompt({ context: conversation.context || {} }) },
    ...(route.emergency ? [{ role: 'system', content: EMERGENCY_SYSTEM_NOTE }] : []),
    ...history,
    { role: 'user', content: text },
  ];

  const actions = [];
  const toolsUsed = [];
  let contextPatch = {};
  let toolsEnabled = true;
  let finalText = null;

  for (let step = 0; step < config.ai.maxToolIterations; step += 1) {
    const { message } = await provider.chat({
      messages,
      tools: toolsEnabled ? providerTools : undefined,
    });

    const toolCalls = message.tool_calls || [];
    if (!toolCalls.length) {
      finalText = (message.content || '').trim();
      break;
    }

    messages.push({ role: 'assistant', content: message.content ?? null, tool_calls: toolCalls });

    for (let index = 0; index < toolCalls.length; index += 1) {
      const toolCall = toolCalls[index];

      // Every tool_call id must receive a tool message, even rejected ones.
      if (index >= MAX_TOOL_CALLS_PER_STEP) {
        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify({ ok: false, error: 'Too many tool calls at once.' }),
        });
        continue;
      }

      const result = await toolExecutor.run({
        toolCall,
        user,
        agentName: agent.name,
        conversation,
        allowedToolNames,
      });

      toolsUsed.push(result.toolName);
      actions.push(...result.actions);
      if (result.context) contextPatch = { ...contextPatch, ...result.context };
      messages.push({ role: 'tool', tool_call_id: toolCall.id, content: result.content });

      // After proposing a consequential action the model may only explain it, not act further.
      if (result.actions.some((action) => action.type === 'CONFIRMATION')) {
        toolsEnabled = false;
      }
    }
  }

  return {
    text: finalText || FALLBACK_REPLY,
    actions: actions.slice(0, MAX_ACTIONS_PER_REPLY),
    toolsUsed,
    contextPatch,
  };
};

/**
 * Handles one chat turn for the authenticated user.
 * @param {{ user: {id: string, role: string}, message: string, conversationId?: string|null }} input
 */
const chat = async ({ user, message, conversationId }) => {
  const agent = resolveAgent(user);
  const provider = getProvider();
  if (!provider.isConfigured()) {
    throw new AppError('The AI assistant is not configured on this server.', 503);
  }

  const text = sanitizeMessage(message);
  if (!text) throw new AppError('Message is empty.', 400);

  let conversation;
  let created = false;
  if (conversationId) {
    conversation = await conversationService.getOwned(conversationId, user.id);
    if (conversation.agent !== agent.name) {
      throw new AppError('This conversation belongs to a different assistant.', 403);
    }
  } else {
    conversation = await conversationService.create({ userId: user.id, agent: agent.name, firstMessage: text });
    created = true;
  }

  try {
    const history = await conversationService.getHistoryForModel(conversation);
    const route = intentRouter.route({
      message: text,
      agent: agent.name,
      previousIntents: conversation.context?.lastIntents || [],
    });

    const result = await runAgentLoop({ agent, user, conversation, history, text, route });

    const replyText = route.emergency
      ? `${intentRouter.EMERGENCY_NOTICE}\n\n${result.text}`
      : result.text;

    await conversationService.appendMessage({ conversation, role: 'user', content: text });
    const assistantMessage = await conversationService.appendMessage({
      conversation,
      role: 'assistant',
      content: replyText,
      actions: result.actions,
      toolsUsed: result.toolsUsed,
    });

    await conversationService.updateContext(conversation, {
      ...result.contextPatch,
      ...(route.intents.length ? { lastIntents: route.intents } : {}),
    });

    return {
      conversationId: conversation._id.toString(),
      agent: agent.name,
      title: conversation.title,
      messageId: assistantMessage._id.toString(),
      message: replyText,
      actions: result.actions,
      createdAt: assistantMessage.createdAt.toISOString(),
    };
  } catch (error) {
    // Don't leave an empty shell behind when the very first turn fails.
    if (created) {
      await conversationService.remove(conversation._id, user.id).catch(() => {});
    }
    if (!isOperationalError(error)) {
      logger.error(`AI chat failed: ${error.stack || error.message}`);
    }
    throw error;
  }
};

const getCapabilities = (user) => {
  try {
    const agent = resolveAgent(user);
    const tools = getToolsForAgent(agent.name).map((tool) => ({
      name: tool.name,
      description: tool.description,
      intent: tool.intent,
      requiresConfirmation: tool.requiresConfirmation,
    }));
    return {
      available: true,
      configured: getProvider().isConfigured(),
      agent: agent.name,
      label: agent.label,
      tagline: agent.tagline,
      welcome: agent.welcome,
      suggestions: agent.suggestions,
      tools,
    };
  } catch (error) {
    if (isOperationalError(error)) {
      return { available: false, configured: getProvider().isConfigured(), reason: error.message };
    }
    throw error;
  }
};

module.exports = { chat, getCapabilities, sanitizeMessage };

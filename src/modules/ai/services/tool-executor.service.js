const logger = require('../../../core/utils/logger');
const { isOperationalError } = require('./errors');
const { getTool } = require('../tools/tool.registry');
const { canUseTool } = require('./permission.service');
const pendingActions = require('./pending-action.service');

const MAX_TOOL_RESULT_CHARS = 7000;

const toModelContent = (payload) => {
  const json = JSON.stringify(payload);
  if (json.length <= MAX_TOOL_RESULT_CHARS) return json;
  return JSON.stringify({ ok: true, truncated: true, note: 'Result too large; ask the user to narrow the request.' });
};

const failure = (error) => ({ content: toModelContent({ ok: false, error }), actions: [], context: null });

/**
 * Executes ONE model-requested tool call safely:
 *   allow-list -> role check -> schema validation -> (confirmation gate | execute via services).
 *
 * The model never gets to run anything directly: unknown tools, tools of other agents and
 * malformed arguments are rejected here, and consequential tools only create a pending
 * proposal that the user must confirm.
 */
const run = async ({ toolCall, user, agentName, conversation, allowedToolNames }) => {
  const name = toolCall.function?.name;
  const tool = getTool(name);

  if (!tool || !allowedToolNames.has(name) || !canUseTool(user, tool)) {
    logger.warn(`AI tool rejected: "${name}" for user ${user.id} (${user.role})`);
    return { toolName: name, ...failure('This tool is not available.') };
  }

  let rawArgs;
  try {
    rawArgs = JSON.parse(toolCall.function.arguments || '{}');
  } catch {
    return { toolName: name, ...failure('Arguments were not valid JSON.') };
  }

  const parsed = tool.schema.safeParse(rawArgs);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => `${issue.path.join('.') || 'args'}: ${issue.message}`);
    return { toolName: name, ...failure(`Invalid arguments — ${issues.join('; ')}`) };
  }

  const ctx = { user: { id: user.id, role: user.role }, conversation };

  try {
    if (tool.requiresConfirmation) {
      const proposal = await tool.prepare(parsed.data, ctx);
      const pending = await pendingActions.create({
        user,
        conversation,
        agent: agentName,
        tool: tool.name,
        args: proposal.args,
        summary: proposal.summary,
      });

      return {
        toolName: name,
        content: toModelContent({
          ok: true,
          status: 'AWAITING_USER_CONFIRMATION',
          summary: proposal.summary,
          instruction:
            'Nothing has been done yet. Tell the user to review the confirmation card and press Confirm (or Cancel). Do not call this tool again.',
        }),
        actions: [
          {
            type: 'CONFIRMATION',
            data: {
              actionId: pending.id,
              tool: tool.name,
              summary: proposal.summary,
              details: (proposal.details || []).slice(0, 12),
              expiresAt: pending.expiresAt,
            },
          },
        ],
        context: null,
      };
    }

    const result = await tool.execute(parsed.data, ctx);
    return {
      toolName: name,
      content: toModelContent({ ok: true, ...result.data }),
      actions: result.actions || [],
      context: result.context || null,
    };
  } catch (error) {
    // Business-rule failures (404/400/409/403...) are explained to the model so it can help the user.
    if (isOperationalError(error)) {
      return { toolName: name, ...failure(error.message) };
    }
    logger.error(`AI tool "${name}" crashed: ${error.stack || error.message}`);
    return { toolName: name, ...failure('The tool failed unexpectedly. Apologise and suggest trying again.') };
  }
};

module.exports = { run, MAX_TOOL_RESULT_CHARS };

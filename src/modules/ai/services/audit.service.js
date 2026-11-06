const logger = require('../../../core/utils/logger');
const { AiAuditLog } = require('../memory/audit-log.model');

/** Keys that identify a person or carry free text — removed from audit copies of tool args. */
const PII_KEYS = new Set([
  'name', 'patientName', 'phone', 'patientPhone', 'email', 'patientEmail',
  'address', 'notes', 'patient', 'rejectionReason', 'reason',
]);

const redact = (value) => {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !PII_KEYS.has(key))
        .map(([key, inner]) => [key, redact(inner)]),
    );
  }
  return value;
};

/** Never throws: auditing must not break the user's action, but failures are logged loudly. */
const recordAction = async ({ user, agent, tool, conversationId, pendingActionId, args, outcome, error = '' }) => {
  try {
    await AiAuditLog.create({
      userId: user.id,
      role: user.role,
      agent,
      tool,
      conversationId,
      pendingActionId,
      args: redact(args),
      outcome,
      error: String(error).slice(0, 300),
    });
  } catch (auditError) {
    logger.error(`AI audit log write failed: ${auditError.message}`);
  }
};

module.exports = { recordAction, redact };

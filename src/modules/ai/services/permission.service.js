const { UserRole } = require('../../../shared/enums/userRole.enum');

/**
 * Role → agent mapping. This is the ONLY place that decides which agent a user may talk to.
 * It is driven by the role in the verified JWT context (req.user) — never by message text
 * or any client-supplied parameter.
 */
const ROLE_TO_AGENT = Object.freeze({
  [UserRole.PATIENT]: 'PATIENT',
  [UserRole.DOCTOR]: 'DOCTOR',
  [UserRole.ADMIN]: 'ADMIN',
  [UserRole.SUPER_ADMIN]: 'ADMIN',
});

const agentForRole = (role) => ROLE_TO_AGENT[role] || null;

/** A tool is usable only by the agent that owns it. */
const canUseTool = (user, tool) => {
  const agent = agentForRole(user?.role);
  return Boolean(agent) && tool.agent === agent;
};

module.exports = { ROLE_TO_AGENT, agentForRole, canUseTool };

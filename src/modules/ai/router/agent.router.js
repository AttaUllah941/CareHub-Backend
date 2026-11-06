const { AppError, ForbiddenError } = require('../../../core/errors/AppError');
const { agentForRole } = require('../services/permission.service');
const agents = require('../agents');

/**
 * Resolves the agent for the authenticated user.
 * The role comes exclusively from req.user (verified JWT) — there is no way for the client to
 * pick or override an agent.
 */
const resolveAgent = (user) => {
  const agentName = agentForRole(user?.role);
  if (!agentName) {
    throw new ForbiddenError('No AI assistant is available for your account type.');
  }

  const agent = agents[agentName];
  if (!agent) {
    throw new AppError(`The ${agentName.toLowerCase()} assistant is not available yet.`, 501);
  }

  return agent;
};

module.exports = { resolveAgent };

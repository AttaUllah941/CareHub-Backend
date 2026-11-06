const { buildAdminPrompt, ADMIN_SUGGESTIONS } = require('../prompts/admin.prompt');

module.exports = {
  name: 'ADMIN',
  label: 'Admin Assistant',
  tagline: 'Users, doctors, catalog, orders & reports',
  welcome: 'Review applications, manage users, labs, medicines and orders, and pull platform reports.',
  buildSystemPrompt: buildAdminPrompt,
  suggestions: ADMIN_SUGGESTIONS,
};

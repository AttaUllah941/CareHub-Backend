/**
 * Agent registry. Each agent owns its prompt and suggestions; tools are tagged with the agent
 * that may use them (see tools/tool.registry.js and services/permission.service.js).
 */
module.exports = {
  PATIENT: require('./patient.agent'),
  DOCTOR: require('./doctor.agent'),
  ADMIN: require('./admin.agent'),
};

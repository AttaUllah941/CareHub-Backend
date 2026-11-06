const { z } = require('zod');

/**
 * Declares a tool the model may request. Tools never touch the database: they validate input,
 * authorise via the caller's identity, and delegate to the existing service layer.
 *
 * @typedef {object} ToolDefinition
 * @property {string} name                 Unique function name exposed to the model.
 * @property {'PATIENT'|'DOCTOR'|'ADMIN'} agent  Only this agent can use the tool.
 * @property {string} intent               Domain tag used by the intent router to narrow tool sets.
 * @property {string} description          Shown to the model.
 * @property {import('zod').ZodTypeAny} schema  Argument schema (also published to the model as JSON schema).
 * @property {(args, ctx) => Promise<{args, summary}>} [prepare]  Required for confirmation tools: validates
 *        and returns normalised args plus a human-readable summary. Must not change any state.
 * @property {(args, ctx) => Promise<{data, actions?, context?}>} execute  Performs the work through existing services.
 * @property {boolean} [requiresConfirmation]  When true the model can only *propose*; the user confirms.
 */
const defineTool = (definition) => {
  const { name, agent, intent, description, schema, execute, requiresConfirmation = false, prepare } =
    definition;

  if (!name || !agent || !intent || !description || !schema || typeof execute !== 'function') {
    throw new Error(`Invalid tool definition: ${name || '<unnamed>'}`);
  }
  if (requiresConfirmation && typeof prepare !== 'function') {
    throw new Error(`Confirmation tool "${name}" must define prepare()`);
  }

  const parameters = z.toJSONSchema(schema, { io: 'input' });
  delete parameters.$schema;
  parameters.additionalProperties = false;

  return Object.freeze({ ...definition, requiresConfirmation, parameters });
};

const toolsByName = new Map();
let loaded = false;

const loadAll = () => {
  if (loaded) return;
  const modules = [
    require('./doctor.tools'),
    require('./appointment.tools'),
    require('./lab.tools'),
    require('./medicine.tools'),
    require('./surgery.tools'),
    require('./health.tools'),
    require('./doctor-appointments.tools'),
    require('./doctor-practice.tools'),
    require('./doctor-clinical.tools'),
    require('./admin-users.tools'),
    require('./admin-doctors.tools'),
    require('./admin-catalog.tools'),
    require('./admin-orders-reports.tools'),
  ];
  for (const tools of modules) {
    for (const tool of tools) {
      if (toolsByName.has(tool.name)) throw new Error(`Duplicate tool name: ${tool.name}`);
      toolsByName.set(tool.name, tool);
    }
  }
  loaded = true;
};

const getTool = (name) => {
  loadAll();
  return toolsByName.get(name) || null;
};

const getToolsForAgent = (agent, { intents } = {}) => {
  loadAll();
  const all = [...toolsByName.values()].filter((tool) => tool.agent === agent);
  if (!intents?.length) return all;
  const narrowed = all.filter((tool) => intents.includes(tool.intent));
  return narrowed.length ? narrowed : all;
};

/** Converts tool definitions to the OpenAI function-calling format. */
const toProviderTools = (tools) =>
  tools.map((tool) => ({
    type: 'function',
    function: { name: tool.name, description: tool.description, parameters: tool.parameters },
  }));

module.exports = { defineTool, getTool, getToolsForAgent, toProviderTools };

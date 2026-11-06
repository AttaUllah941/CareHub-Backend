const intentRouter = require('../router/intent.router');
const { resolveAgent } = require('../router/agent.router');
const { agentForRole, canUseTool } = require('../services/permission.service');
const { sanitizeMessage } = require('../services/ai.service');
const { chatSchema } = require('../validators/chat.validator');
const { getToolsForAgent, getTool } = require('../tools/tool.registry');
const { citySchema } = require('../tools/tool.helpers');
const { redact } = require('../services/audit.service');

describe('intent router', () => {
  it('detects emergencies', () => {
    expect(intentRouter.route({ message: "I have chest pain and can't breathe" }).emergency).toBe(true);
    expect(intentRouter.route({ message: 'Find a dentist in Lahore' }).emergency).toBe(false);
  });

  it('infers domains from the message', () => {
    const { intents } = intentRouter.route({ message: 'Find a cardiologist in Lahore under Rs 2000' });
    expect(intents).toContain('doctors');

    expect(intentRouter.route({ message: 'compare CBC test prices' }).intents).toContain('labs');
    expect(intentRouter.route({ message: 'order paracetamol for delivery' }).intents).toContain('medicines');
  });

  it('adds doctors to health questions so the assistant can offer a doctor', () => {
    const { intents } = intentRouter.route({ message: 'I have had a fever for 3 days' });
    expect(intents).toEqual(expect.arrayContaining(['health', 'doctors']));
  });

  it('falls back to the previous intents for short follow-ups', () => {
    const { intents } = intentRouter.route({ message: 'ok thanks', previousIntents: ['labs'] });
    expect(intents).toEqual(['labs']);
  });
});

describe('agent routing & permissions', () => {
  it('maps roles to agents from the verified role only', () => {
    expect(agentForRole('PATIENT')).toBe('PATIENT');
    expect(agentForRole('SUPER_ADMIN')).toBe('ADMIN');
    expect(agentForRole('LAB')).toBeNull();
  });

  it('resolves the patient agent for patients', () => {
    expect(resolveAgent({ id: '1', role: 'PATIENT' }).name).toBe('PATIENT');
  });

  it('gives each supported role its own agent and others none', () => {
    expect(resolveAgent({ id: '1', role: 'DOCTOR' }).name).toBe('DOCTOR');
    expect(resolveAgent({ id: '1', role: 'ADMIN' }).name).toBe('ADMIN');
    expect(resolveAgent({ id: '1', role: 'SUPER_ADMIN' }).name).toBe('ADMIN');
    expect(() => resolveAgent({ id: '1', role: 'LAB' })).toThrow(/No AI assistant/);
    expect(() => resolveAgent({ id: '1', role: 'PHARMACY' })).toThrow(/No AI assistant/);
  });

  it('only allows tools of the caller\'s own agent', () => {
    const tool = getTool('searchDoctors');
    expect(canUseTool({ role: 'PATIENT' }, tool)).toBe(true);
    expect(canUseTool({ role: 'DOCTOR' }, tool)).toBe(false);
    expect(canUseTool({ role: 'ADMIN' }, tool)).toBe(false);
  });
});

describe('per-agent intent routing', () => {
  it('uses doctor and admin vocabularies', () => {
    expect(intentRouter.route({ agent: 'DOCTOR', message: "Show today's appointments" }).intents).toContain('appointments');
    expect(intentRouter.route({ agent: 'DOCTOR', message: 'Show my earnings this month' }).intents).toContain('analytics');
    expect(intentRouter.route({ agent: 'DOCTOR', message: 'Which patients need a follow-up?' }).intents).toContain('followups');
    expect(intentRouter.route({ agent: 'ADMIN', message: 'List pending doctor applications' }).intents).toContain('applications');
    expect(intentRouter.route({ agent: 'ADMIN', message: 'Revenue report for this month' }).intents).toContain('reports');
    expect(intentRouter.route({ agent: 'ADMIN', message: 'Show delivered orders' }).intents).toContain('orders');
  });

  it('only flags emergencies for patients', () => {
    const message = 'patient has chest pain';
    expect(intentRouter.route({ agent: 'PATIENT', message }).emergency).toBe(true);
    expect(intentRouter.route({ agent: 'DOCTOR', message }).emergency).toBe(false);
    expect(intentRouter.route({ agent: 'ADMIN', message }).emergency).toBe(false);
  });

  it('ignores previous intents that belong to a different agent vocabulary', () => {
    expect(intentRouter.route({ agent: 'ADMIN', message: 'ok', previousIntents: ['doctors', 'orders'] }).intents).toEqual(['orders']);
  });
});

describe('agent tool ownership', () => {
  const clinicalOrAdminMutations = [
    'confirmAppointment', 'rejectAppointment', 'completeAppointment', 'addScheduleSlot', 'removeScheduleSlot', 'draftPrescription',
    'setUserActive', 'approveApplication', 'rejectApplication', 'setDoctorVerification', 'createLab', 'createLabTest',
    'updateLabTest', 'createMedicine', 'updateMedicine', 'setPharmacyActive', 'updateOrderStatus',
  ];

  it('requires confirmation for every doctor/admin tool that changes data', () => {
    for (const name of clinicalOrAdminMutations) {
      expect(getTool(name).requiresConfirmation).toBe(true);
    }
  });

  it('keeps read-only tools free of side effects (no confirmation flag)', () => {
    for (const name of ['listAppointments', 'getSchedule', 'getEarnings', 'searchUsers', 'getRevenueReport', 'searchOrders']) {
      expect(getTool(name).requiresConfirmation).toBe(false);
    }
  });

  it('never lets one agent see another agent\'s tools', () => {
    const names = (agent) => getToolsForAgent(agent).map((tool) => tool.name);
    expect(names('DOCTOR')).not.toContain('searchUsers');
    expect(names('DOCTOR')).not.toContain('searchDoctors');
    expect(names('ADMIN')).not.toContain('draftPrescription');
    expect(names('ADMIN')).not.toContain('bookAppointment');
    expect(names('PATIENT')).not.toContain('confirmAppointment');
    expect(names('PATIENT')).not.toContain('setUserActive');
  });

  it('only SUPER_ADMIN and ADMIN map to the admin agent', () => {
    const tool = getTool('setUserActive');
    expect(canUseTool({ role: 'ADMIN' }, tool)).toBe(true);
    expect(canUseTool({ role: 'SUPER_ADMIN' }, tool)).toBe(true);
    expect(canUseTool({ role: 'DOCTOR' }, tool)).toBe(false);
    expect(canUseTool({ role: 'PATIENT' }, tool)).toBe(false);
    expect(canUseTool({ role: 'PHARMACY' }, tool)).toBe(false);
  });
});

describe('request validation', () => {
  it('rejects client-supplied role or agent fields', () => {
    expect(chatSchema.safeParse({ message: 'hi', role: 'ADMIN' }).success).toBe(false);
    expect(chatSchema.safeParse({ message: 'hi', agent: 'ADMIN' }).success).toBe(false);
    expect(chatSchema.safeParse({ message: 'hi', conversationId: null }).success).toBe(true);
  });

  it('bounds message length and requires content', () => {
    expect(chatSchema.safeParse({ message: '   ' }).success).toBe(false);
    expect(chatSchema.safeParse({ message: 'x'.repeat(5000) }).success).toBe(false);
  });

  it('strips control and invisible characters', () => {
    expect(sanitizeMessage('hel\u0000lo​ ‮world')).toBe('hello world');
  });

  it('restricts city arguments to letters (existing services build RegExps from them)', () => {
    expect(citySchema.safeParse('Lahore').success).toBe(true);
    expect(citySchema.safeParse('Rawal Pindi').success).toBe(true);
    expect(citySchema.safeParse('.*').success).toBe(false);
    expect(citySchema.safeParse('(a+)+$').success).toBe(false);
  });
});

describe('tool registry', () => {
  it('publishes JSON schemas and never exposes unknown properties', () => {
    for (const tool of getToolsForAgent('PATIENT')) {
      expect(tool.parameters.type).toBe('object');
      expect(tool.parameters.additionalProperties).toBe(false);
    }
  });

  it('marks every state-changing tool as requiring confirmation', () => {
    const consequential = ['bookAppointment', 'cancelAppointment', 'createLabBooking', 'createMedicineOrder', 'submitSurgeryConsultation'];
    for (const name of consequential) {
      expect(getTool(name).requiresConfirmation).toBe(true);
    }
  });

  it('narrows tools by intent but never returns an empty set', () => {
    const labs = getToolsForAgent('PATIENT', { intents: ['labs'] }).map((tool) => tool.name);
    expect(labs).toContain('compareTestPrices');
    expect(labs).not.toContain('searchDoctors');
    expect(getToolsForAgent('PATIENT', { intents: ['unknown'] }).length).toBeGreaterThan(0);
  });
});

describe('audit redaction', () => {
  it('removes personal fields from audit copies', () => {
    expect(
      redact({ labId: 'a', patient: { name: 'X', phone: '1' }, address: 'Street', scheduledDate: '2026-01-01' }),
    ).toEqual({ labId: 'a', scheduledDate: '2026-01-01' });
  });
});

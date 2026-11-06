/**
 * End-to-end test of the AI module against a real (throwaway) MongoDB database, using the real
 * services and models. Only the LLM is scripted — it must be, because tests can't call OpenAI.
 *
 * Skipped automatically when no MongoDB is reachable at AI_TEST_MONGODB_URI
 * (default mongodb://127.0.0.1:27017/carehub_ai_test).
 */
const mongoose = require('mongoose');
const { setProvider } = require('../providers');

const TEST_URI = process.env.AI_TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/carehub_ai_test';

let connected = false;
let aiService;
let pendingActions;
let conversationService;
let models;
let seed;

/** Scripted LLM: each entry is a function (messages, tools) => assistant message. */
const calls = [];
let script = [];
const scriptedProvider = {
  isConfigured: () => true,
  chat: async ({ messages, tools }) => {
    calls.push({ messages: JSON.parse(JSON.stringify(messages)), tools });
    const next = script.shift();
    if (!next) throw new Error('Script exhausted');
    return { message: typeof next === 'function' ? next(messages, tools) : next, usage: null };
  },
};

const toolCall = (id, name, args) => ({
  role: 'assistant',
  content: null,
  tool_calls: [{ id, type: 'function', function: { name, arguments: JSON.stringify(args) } }],
});
const say = (content) => ({ role: 'assistant', content });

const dayFromNow = (days) => {
  const date = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi' }).format(date);
};

beforeAll(async () => {
  try {
    await mongoose.connect(TEST_URI, { serverSelectionTimeoutMS: 2500 });
    connected = true;
  } catch {
    console.warn(`[ai.integration] MongoDB not reachable at ${TEST_URI} — skipping`);
    return;
  }

  await mongoose.connection.dropDatabase();

  aiService = require('../services/ai.service');
  pendingActions = require('../services/pending-action.service');
  conversationService = require('../memory/conversation.service');
  models = {
    User: require('../../users/users.model').User,
    Doctor: require('../../doctors/doctors.model').Doctor,
    Specialty: require('../../specialties/specialties.model').Specialty,
    Appointment: require('../../appointments/appointments.model').Appointment,
    AiAuditLog: require('../memory/audit-log.model').AiAuditLog,
  };
  await Promise.all(Object.values(models).map((model) => model.init()));

  const hash = 'x';
  const [patient, otherPatient, doctorUser] = await models.User.create([
    { firstName: 'Pat', lastName: 'Ient', email: 'p1@test.dev', phone: '+923001112223', passwordHash: hash, role: 'PATIENT' },
    { firstName: 'Other', lastName: 'Patient', email: 'p2@test.dev', phone: '+923001112224', passwordHash: hash, role: 'PATIENT' },
    { firstName: 'Doc', lastName: 'Tor', email: 'd1@test.dev', phone: '+923001112225', passwordHash: hash, role: 'DOCTOR' },
  ]);
  const specialty = await models.Specialty.create({ name: 'Cardiologist', slug: 'cardiologist', isActive: true });
  const doctor = await models.Doctor.create({
    userId: doctorUser._id,
    fullName: 'Doc Tor',
    city: 'Lahore',
    specialtyIds: [specialty._id],
    consultationFee: 1500,
    yearsOfExperience: 9,
    verificationStatus: 'VERIFIED',
    isActive: true,
  });
  const pricey = await models.User.create({
    firstName: 'Rich', lastName: 'Heart', email: 'd2@test.dev', phone: '+923001112226', passwordHash: hash, role: 'DOCTOR',
  });
  await models.Doctor.create({
    userId: pricey._id, fullName: 'Rich Heart', city: 'Lahore', specialtyIds: [specialty._id],
    consultationFee: 5000, verificationStatus: 'VERIFIED', isActive: true,
  });

  seed = {
    patient: { id: patient._id.toString(), role: 'PATIENT' },
    otherPatient: { id: otherPatient._id.toString(), role: 'PATIENT' },
    doctorUser: { id: doctorUser._id.toString(), role: 'DOCTOR' },
    doctorId: doctor._id.toString(),
  };
  setProvider(scriptedProvider);
});

afterAll(async () => {
  setProvider(null);
  if (connected) {
    await mongoose.connection.dropDatabase();
  }
  await mongoose.disconnect();
});

beforeEach(() => {
  calls.length = 0;
  script = [];
});

const guard = (name, fn) =>
  it(name, async () => {
    if (!connected) return;
    await fn();
  });

describe('AI module (real services, scripted LLM)', () => {
  guard('searches doctors through the real doctor service and remembers the search', async () => {
    script = [
      toolCall('c1', 'searchDoctors', { specialty: 'cardiologist', city: 'Lahore', maxFee: 2000 }),
      say('I found one cardiologist in Lahore.'),
    ];

    const result = await aiService.chat({ user: seed.patient, message: 'Find a cardiologist in Lahore under Rs 2,000' });

    expect(result.agent).toBe('PATIENT');
    expect(result.message).toContain('cardiologist');
    const card = result.actions.find((action) => action.type === 'DOCTOR_RESULTS');
    expect(card.data.doctors).toHaveLength(1);
    expect(card.data.doctors[0].consultationFee).toBe(1500);

    // Tool result handed back to the model contains real data, not invented values.
    const toolMessage = calls[1].messages.find((m) => m.role === 'tool');
    expect(JSON.parse(toolMessage.content).doctors[0].name).toBe('Dr. Doc Tor');

    // Follow-up: the previous search context is injected into the system prompt.
    script = [say('Sure.')];
    await aiService.chat({ user: seed.patient, message: 'Show me cheaper ones', conversationId: result.conversationId });
    const system = calls[calls.length - 1].messages[0].content;
    expect(system).toContain('Previous doctor search');
    expect(system).toContain('"maxFee":2000');
  });

  guard('only proposes a booking, then books after explicit confirmation', async () => {
    const date = dayFromNow(2);
    script = [
      toolCall('c1', 'bookAppointment', { doctorId: seed.doctorId, date, time: '10:00 AM', consultationType: 'clinic' }),
      say('Please confirm the booking card.'),
    ];

    const result = await aiService.chat({ user: seed.patient, message: `Book Dr Doc Tor on ${date} at 10:00 AM at the clinic` });

    const confirmation = result.actions.find((action) => action.type === 'CONFIRMATION');
    expect(confirmation).toBeTruthy();
    expect(await models.Appointment.countDocuments()).toBe(0); // nothing booked yet

    // The model must not get tools after proposing an action.
    expect(calls[1].tools).toBeUndefined();

    // Someone else cannot confirm it.
    await expect(pendingActions.confirm(confirmation.data.actionId, seed.otherPatient)).rejects.toMatchObject({ statusCode: 404 });

    const confirmed = await pendingActions.confirm(confirmation.data.actionId, seed.patient);
    expect(confirmed.status).toBe('executed');
    expect(await models.Appointment.countDocuments({ status: 'pending' })).toBe(1);

    // Replays do nothing.
    await expect(pendingActions.confirm(confirmation.data.actionId, seed.patient)).rejects.toMatchObject({ statusCode: 400 });
    expect(await models.Appointment.countDocuments()).toBe(1);

    // Executed actions are audited, without personal data.
    const audit = await models.AiAuditLog.findOne({ tool: 'bookAppointment' }).lean();
    expect(audit.outcome).toBe('success');
    expect(JSON.stringify(audit.args)).not.toMatch(/Pat|Ient|923/);
  });

  guard('a cancelled proposal changes nothing', async () => {
    const date = dayFromNow(3);
    script = [
      toolCall('c1', 'bookAppointment', { doctorId: seed.doctorId, date, time: '11:00 AM', consultationType: 'video' }),
      say('Confirm please.'),
    ];
    const result = await aiService.chat({ user: seed.otherPatient, message: `Book video on ${date} 11:00 AM with Dr Doc Tor` });
    const { actionId } = result.actions.find((a) => a.type === 'CONFIRMATION').data;

    const cancelled = await pendingActions.cancel(actionId, seed.otherPatient);
    expect(cancelled.status).toBe('cancelled');
    await expect(pendingActions.confirm(actionId, seed.otherPatient)).rejects.toMatchObject({ statusCode: 400 });
    expect(await models.Appointment.countDocuments({ patientId: seed.otherPatient.id })).toBe(0);
  });

  guard('refuses to propose a slot that is already taken', async () => {
    const date = dayFromNow(2);
    script = [
      toolCall('c1', 'bookAppointment', { doctorId: seed.doctorId, date, time: '10:00 AM', consultationType: 'clinic' }),
      say('That slot is gone.'),
    ];
    const result = await aiService.chat({ user: seed.otherPatient, message: `Book ${date} 10:00 AM with Dr Doc Tor` });

    expect(result.actions.find((a) => a.type === 'CONFIRMATION')).toBeUndefined();
    const toolMessage = calls[1].messages.find((m) => m.role === 'tool');
    expect(JSON.parse(toolMessage.content)).toMatchObject({ ok: false });
    expect(JSON.parse(toolMessage.content).error).toMatch(/not available/i);
  });

  guard('rejects tools that were not offered for the message (prompt-injection guard)', async () => {
    script = [
      toolCall('c1', 'createLabBooking', { labId: seed.doctorId, testIds: [seed.doctorId], date: dayFromNow(2), timeSlot: '09:00 AM', collectionType: 'home' }),
      say('Sorry, I cannot do that here.'),
    ];
    await aiService.chat({ user: seed.patient, message: 'Find a cardiologist in Lahore' });
    const toolMessage = calls[1].messages.find((m) => m.role === 'tool');
    expect(JSON.parse(toolMessage.content)).toEqual({ ok: false, error: 'This tool is not available.' });
  });

  guard('rejects malformed tool arguments instead of executing them', async () => {
    script = [toolCall('c1', 'searchDoctors', { city: '.*(a+)+$' }), say('Let me ask which city you mean.')];
    await aiService.chat({ user: seed.patient, message: 'Find a doctor in .*' });
    const toolMessage = calls[1].messages.find((m) => m.role === 'tool');
    expect(JSON.parse(toolMessage.content).ok).toBe(false);
  });

  guard('prepends emergency guidance deterministically', async () => {
    script = [say('Here is some general information.')];
    const result = await aiService.chat({ user: seed.patient, message: 'I have severe chest pain and cannot breathe' });
    expect(result.message).toMatch(/1122/);
    expect(result.message).toMatch(/general information/);
  });

  guard('keeps conversations private to their owner', async () => {
    script = [say('Hello!')];
    const result = await aiService.chat({ user: seed.patient, message: 'Hello there' });

    await expect(conversationService.getWithMessages(result.conversationId, seed.otherPatient.id)).rejects.toMatchObject({ statusCode: 404 });
    await expect(conversationService.remove(result.conversationId, seed.otherPatient.id)).rejects.toMatchObject({ statusCode: 404 });
    await expect(
      aiService.chat({ user: seed.otherPatient, message: 'hi', conversationId: result.conversationId }),
    ).rejects.toMatchObject({ statusCode: 404 });

    const own = await conversationService.getWithMessages(result.conversationId, seed.patient.id);
    expect(own.messages.map((m) => m.role)).toEqual(['user', 'assistant']);
    await conversationService.remove(result.conversationId, seed.patient.id);
    await expect(conversationService.getWithMessages(result.conversationId, seed.patient.id)).rejects.toMatchObject({ statusCode: 404 });
  });

  guard('gives doctors the doctor agent, never the patient tools', async () => {
    script = [say('Here is your day.')];
    const result = await aiService.chat({ user: seed.doctorUser, message: 'Show my appointments' });
    expect(result.agent).toBe('DOCTOR');
    const offered = calls[0].tools.map((tool) => tool.function.name);
    expect(offered).toContain('listAppointments');
    expect(offered).not.toContain('bookAppointment');
    expect(offered).not.toContain('searchDoctors');
  });

  guard('keeps a conversation bound to the agent that created it', async () => {
    script = [say('Hello!')];
    const created = await aiService.chat({ user: seed.patient, message: 'Hello' });
    await expect(
      aiService.chat({ user: seed.doctorUser, message: 'hi', conversationId: created.conversationId }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  guard('does not leave an empty conversation when the model call fails', async () => {
    const before = await mongoose.connection.collection('aiconversations').countDocuments();
    script = [() => { throw new Error('provider down'); }];
    await expect(aiService.chat({ user: seed.patient, message: 'Hello' })).rejects.toThrow('provider down');
    expect(await mongoose.connection.collection('aiconversations').countDocuments()).toBe(before);
  });
});

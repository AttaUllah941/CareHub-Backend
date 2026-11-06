/**
 * Doctor and Admin agents against a real (throwaway) MongoDB with the real services.
 * Only the LLM is scripted. Auto-skips when MongoDB isn't reachable.
 */
const mongoose = require('mongoose');
const { setProvider } = require('../providers');

const TEST_URI = process.env.AI_TEST_MONGODB_URI_AGENTS || 'mongodb://127.0.0.1:27017/carehub_ai_test_agents';

let connected = false;
let aiService;
let pendingActions;
let models;
let services;
let U; // seeded users

const calls = [];
let script = [];
const scriptedProvider = {
  isConfigured: () => true,
  chat: async ({ messages, tools }) => {
    calls.push({ messages: JSON.parse(JSON.stringify(messages)), tools });
    const next = script.shift();
    if (!next) throw new Error('Script exhausted');
    return { message: next, usage: null };
  },
};
const toolCall = (name, args, id = 'c1') => ({
  role: 'assistant',
  content: null,
  tool_calls: [{ id, type: 'function', function: { name, arguments: JSON.stringify(args) } }],
});
const say = (content) => ({ role: 'assistant', content });

const toolResult = (index = 1) => JSON.parse(calls[index].messages.find((m) => m.role === 'tool').content);
const chatAs = (user, message) => aiService.chat({ user, message });
const confirmationOf = (reply) => reply.actions.find((a) => a.type === 'CONFIRMATION');
const block = (reply, type) => reply.actions.find((a) => a.type === type);
const daysFromNow = (n) => new Date(Date.now() + n * 864e5);
const dateOnly = (date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi' }).format(date);

beforeAll(async () => {
  try {
    await mongoose.connect(TEST_URI, { serverSelectionTimeoutMS: 2500 });
    connected = true;
  } catch {
    console.warn(`[ai.agents.integration] MongoDB not reachable at ${TEST_URI} — skipping`);
    return;
  }
  await mongoose.connection.dropDatabase();

  aiService = require('../services/ai.service');
  pendingActions = require('../services/pending-action.service');
  models = {
    User: require('../../users/users.model').User,
    Doctor: require('../../doctors/doctors.model').Doctor,
    Specialty: require('../../specialties/specialties.model').Specialty,
    Appointment: require('../../appointments/appointments.model').Appointment,
    Prescription: require('../../prescriptions/prescriptions.model').Prescription,
    MedicineOrder: require('../../medicines/medicine-orders.model').MedicineOrder,
    AiAuditLog: require('../memory/audit-log.model').AiAuditLog,
  };
  services = {
    appointments: require('../../appointments/appointments.service'),
    applications: require('../../doctor-applications/doctor-applications.service'),
  };
  await Promise.all(Object.values(models).map((model) => model.init()));

  const hash = 'x';
  const mk = (firstName, lastName, role, n) => ({
    firstName, lastName, role, email: `${firstName.toLowerCase()}${n}@t.dev`, phone: `+92300111${2000 + n}`, passwordHash: hash,
  });
  const [admin, admin2, superAdmin, patientA, patientB, doc1User, doc2User] = await models.User.create([
    mk('Ada', 'Min', 'ADMIN', 1), mk('Bob', 'Min', 'ADMIN', 2), mk('Sue', 'Per', 'SUPER_ADMIN', 3),
    mk('Pat', 'A', 'PATIENT', 4), mk('Pat', 'B', 'PATIENT', 5), mk('Doc', 'One', 'DOCTOR', 6), mk('Doc', 'Two', 'DOCTOR', 7),
  ]);
  const specialty = await models.Specialty.create({ name: 'Cardiologist', slug: 'cardiologist', isActive: true });
  const base = { city: 'Lahore', specialtyIds: [specialty._id], consultationFee: 1500, verificationStatus: 'VERIFIED', isActive: true };
  const [doc1, doc2] = await models.Doctor.create([
    { userId: doc1User._id, fullName: 'Doc One', ...base },
    { userId: doc2User._id, fullName: 'Doc Two', ...base },
  ]);

  const who = (user, role) => ({ id: user._id.toString(), role });
  U = {
    admin: who(admin, 'ADMIN'), admin2: who(admin2, 'ADMIN'), superAdmin: who(superAdmin, 'SUPER_ADMIN'),
    patientA: who(patientA, 'PATIENT'), patientB: who(patientB, 'PATIENT'),
    doctor1: who(doc1User, 'DOCTOR'), doctor2: who(doc2User, 'DOCTOR'),
    doc1Id: doc1._id.toString(), doc2Id: doc2._id.toString(),
  };

  // Each patient books with "their" doctor through the real booking service.
  const slot = (days) => new Date(`${dateOnly(daysFromNow(days))}T10:00:00+05:00`).toISOString();
  U.apptA = (await services.appointments.createAppointment({ doctorId: U.doc1Id, scheduledAt: slot(3) }, U.patientA)).appointment;
  U.apptB = (await services.appointments.createAppointment({ doctorId: U.doc2Id, scheduledAt: slot(4) }, U.patientB)).appointment;
  setProvider(scriptedProvider);
});

afterAll(async () => {
  setProvider(null);
  if (connected) await mongoose.connection.dropDatabase();
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

describe('Doctor agent', () => {
  guard('lists only the signed-in doctor\'s own appointments', async () => {
    script = [toolCall('listAppointments', { when: 'upcoming' }), say('Here they are.')];
    const reply = await chatAs(U.doctor1, 'Show my upcoming appointments');
    expect(reply.agent).toBe('DOCTOR');
    expect(toolResult()).toMatchObject({ ok: true, total: 1 });
    expect(toolResult().appointments[0].patient).toBe('Pat A');
    expect(block(reply, 'LIST').data.items[0].actions.map((a) => a.label)).toContain('Confirm');

    script = [toolCall('listAppointments', { when: 'upcoming' }), say('Done.')];
    calls.length = 0;
    await chatAs(U.doctor2, 'Show my upcoming appointments');
    expect(toolResult().appointments.map((a) => a.patient)).toEqual(['Pat B']);
  });

  guard('confirming needs the doctor\'s explicit confirmation, is scoped, and is audited', async () => {
    // Another doctor cannot even propose it.
    script = [toolCall('confirmAppointment', { appointmentId: U.apptA.id }), say('Not possible.')];
    await chatAs(U.doctor2, 'Confirm this appointment please');
    expect(toolResult()).toMatchObject({ ok: false });
    expect(toolResult().error).toMatch(/not found among your appointments/i);

    calls.length = 0;
    script = [toolCall('confirmAppointment', { appointmentId: U.apptA.id }), say('Please confirm the card.')];
    const reply = await chatAs(U.doctor1, 'Confirm this appointment please');
    const confirmation = confirmationOf(reply);
    expect(confirmation).toBeTruthy();
    expect((await models.Appointment.findById(U.apptA.id)).status).toBe('pending');

    await pendingActions.confirm(confirmation.data.actionId, U.doctor1);
    expect((await models.Appointment.findById(U.apptA.id)).status).toBe('confirmed');

    const audit = await models.AiAuditLog.findOne({ tool: 'confirmAppointment' }).lean();
    expect(audit).toMatchObject({ role: 'DOCTOR', agent: 'DOCTOR', outcome: 'success' });
  });

  guard('only exposes patients who have appointments with this doctor', async () => {
    script = [toolCall('getPatientHistory', { patientId: U.patientA.id }), say('History shown.')];
    await chatAs(U.doctor1, 'Show patient history');
    expect(toolResult()).toMatchObject({ ok: true });
    expect(toolResult().patient.name).toBe('Pat A');

    calls.length = 0;
    script = [toolCall('getPatientHistory', { patientId: U.patientB.id }), say('I cannot access that.')];
    await chatAs(U.doctor1, 'Show patient history');
    expect(toolResult()).toMatchObject({ ok: false });
    expect(toolResult().error).toMatch(/No patient with that id/);

    calls.length = 0;
    script = [toolCall('listMyPatients', {}), say('Listed.')];
    await chatAs(U.doctor1, 'List my patients');
    expect(toolResult().patients.map((p) => p.name)).toEqual(['Pat A']);
  });

  guard('prescription drafts are reviewed, relationship-checked, and saved only after confirmation', async () => {
    const draft = {
      patientId: U.patientA.id,
      diagnosis: 'Hypertension',
      medicines: [{ name: 'Amlodipine', dosage: '5 mg once daily', duration: '30 days' }],
    };
    script = [toolCall('draftPrescription', draft), say('Please review the draft.')];
    const reply = await chatAs(U.doctor1, 'Write a prescription for Pat A');

    const confirmation = confirmationOf(reply);
    expect(confirmation.data.details.map((d) => d.label)).toEqual(expect.arrayContaining(['Patient', 'Diagnosis', 'Medicine 1']));
    expect(await models.Prescription.countDocuments()).toBe(0);

    await pendingActions.confirm(confirmation.data.actionId, U.doctor1);
    const saved = await models.Prescription.find().lean();
    expect(saved).toHaveLength(1);
    expect(saved[0].doctorId.toString()).toBe(U.doc1Id);
    expect(saved[0].patientName).toBe('Pat A'); // name comes from the record, not the model

    // A patient the doctor has no relationship with is refused at proposal time.
    calls.length = 0;
    script = [toolCall('draftPrescription', { ...draft, patientId: U.patientB.id }), say('Not allowed.')];
    const refused = await chatAs(U.doctor1, 'Write a prescription for Pat B');
    expect(confirmationOf(refused)).toBeUndefined();
    expect(toolResult()).toMatchObject({ ok: false });
  });

  guard('analytics, earnings and follow-ups are computed from the doctor\'s own completed visits', async () => {
    // A completed visit 10 days ago (set up directly: past appointments can't be booked).
    await models.Appointment.updateOne(
      { _id: U.apptA.id },
      { status: 'completed', scheduledAt: daysFromNow(-10), $unset: { slotKey: 1, pairKey: 1 } },
    );

    script = [toolCall('getAppointmentAnalytics', {}), say('Stats ready.')];
    const stats = await chatAs(U.doctor1, 'Show my appointment statistics');
    expect(toolResult()).toMatchObject({ ok: true, total: 1 });
    expect(toolResult().byStatus.completed).toBe(1);
    expect(block(stats, 'STATS')).toBeTruthy();

    calls.length = 0;
    script = [toolCall('getEarnings', {}), say('Earnings ready.')];
    await chatAs(U.doctor1, 'Show my earnings');
    expect(toolResult()).toMatchObject({ ok: true, earningsInRange: 1500, earningsAllTime: 1500, completedInRange: 1 });

    calls.length = 0;
    script = [toolCall('getFollowUps', { minDaysSince: 7 }), say('Follow-ups listed.')];
    await chatAs(U.doctor1, 'Which patients need a follow-up?');
    expect(toolResult().followUps.map((f) => f.patientName)).toEqual(['Pat A']);
    expect(toolResult().followUps[0].daysSinceLastVisit).toBeGreaterThanOrEqual(10);

    // The other doctor sees none of it.
    calls.length = 0;
    script = [toolCall('getEarnings', {}), say('Nothing yet.')];
    await chatAs(U.doctor2, 'Show my earnings');
    expect(toolResult().earningsAllTime).toBe(0);
  });

  guard('adds and removes availability only after confirmation', async () => {
    script = [toolCall('addScheduleSlot', { dayOfWeek: 1, startTime: '09:00', endTime: '12:00', consultationType: 'video' }), say('Confirm the slot.')];
    const reply = await chatAs(U.doctor1, 'Add Monday video availability 9 to 12 to my schedule');
    const confirmation = confirmationOf(reply);
    expect(confirmation.data.summary).toMatch(/Monday/);

    await pendingActions.confirm(confirmation.data.actionId, U.doctor1);

    calls.length = 0;
    script = [toolCall('getSchedule', {}), say('Here is your schedule.')];
    await chatAs(U.doctor1, 'Show my schedule');
    expect(toolResult().schedules).toHaveLength(1);
    expect(toolResult().schedules[0].when).toMatch(/Monday 09:00–12:00/);
  });
});

describe('role isolation', () => {
  guard('patients cannot reach doctor or admin tools', async () => {
    script = [toolCall('draftPrescription', { patientName: 'X Y', diagnosis: 'dd', medicines: [{ name: 'm' }] }), say('No.')];
    await chatAs(U.patientA, 'write a prescription');
    expect(toolResult()).toEqual({ ok: false, error: 'This tool is not available.' });

    calls.length = 0;
    script = [toolCall('searchUsers', {}), say('No.')];
    await chatAs(U.patientA, 'search users');
    expect(toolResult()).toEqual({ ok: false, error: 'This tool is not available.' });
  });

  guard('doctors cannot reach admin tools and admins cannot reach doctor tools', async () => {
    script = [toolCall('setUserActive', { userId: U.patientA.id, isActive: false }), say('No.')];
    await chatAs(U.doctor1, 'deactivate user');
    expect(toolResult()).toEqual({ ok: false, error: 'This tool is not available.' });

    calls.length = 0;
    script = [toolCall('listAppointments', {}), say('No.')];
    await chatAs(U.admin, 'show appointments today');
    expect(toolResult()).toEqual({ ok: false, error: 'This tool is not available.' });
  });

  guard('keeps emergency banners for patients only', async () => {
    script = [say('General info.')];
    const patient = await chatAs(U.patientA, 'I have chest pain');
    expect(patient.message).toMatch(/1122/);

    script = [say('Noted.')];
    const doctor = await chatAs(U.doctor1, 'Patient reports chest pain, summarise my pending requests');
    expect(doctor.message).not.toMatch(/1122/);
  });
});

describe('Admin agent', () => {
  guard('searches users and deactivates one only after confirmation, with audit', async () => {
    script = [toolCall('searchUsers', { role: 'PATIENT' }), say('Found them.')];
    const reply = await chatAs(U.admin, 'Search users who are patients');
    expect(reply.agent).toBe('ADMIN');
    expect(toolResult().users.map((u) => u.name).sort()).toEqual(['Pat A', 'Pat B']);
    expect(block(reply, 'LIST')).toBeTruthy();

    calls.length = 0;
    script = [toolCall('setUserActive', { userId: U.patientB.id, isActive: false }), say('Confirm please.')];
    const proposal = await chatAs(U.admin, 'Deactivate user Pat B');
    const confirmation = confirmationOf(proposal);
    expect((await models.User.findById(U.patientB.id)).isActive).toBe(true);

    await pendingActions.confirm(confirmation.data.actionId, U.admin);
    expect((await models.User.findById(U.patientB.id)).isActive).toBe(false);
    expect(await models.AiAuditLog.countDocuments({ tool: 'setUserActive', role: 'ADMIN', outcome: 'success' })).toBe(1);
  });

  guard('enforces admin-safety rules the raw endpoint lacks', async () => {
    // Cannot change own status.
    script = [toolCall('setUserActive', { userId: U.admin.id, isActive: false }), say('No.')];
    await chatAs(U.admin, 'deactivate user me');
    expect(toolResult().error).toMatch(/your own account/i);

    // A plain ADMIN cannot touch another administrator…
    calls.length = 0;
    script = [toolCall('setUserActive', { userId: U.admin2.id, isActive: false }), say('No.')];
    await chatAs(U.admin, 'deactivate user Bob');
    expect(toolResult().error).toMatch(/super admin/i);

    // …but a SUPER_ADMIN can (still via confirmation).
    calls.length = 0;
    script = [toolCall('setUserActive', { userId: U.admin2.id, isActive: false }), say('Confirm.')];
    const reply = await chatAs(U.superAdmin, 'deactivate user Bob');
    await pendingActions.confirm(confirmationOf(reply).data.actionId, U.superAdmin);
    expect((await models.User.findById(U.admin2.id)).isActive).toBe(false);
  });

  guard('reviews doctor applications: approve and reject (reason required) with confirmation', async () => {
    const application = (n) => ({
      firstName: `App${n}`, lastName: 'Licant', email: `app${n}@t.dev`, phone: '+923001119990', password: 'password123',
      documents: [{ type: 'license', url: 'https://example.com/a.pdf', mimeType: 'application/pdf', size: 1000 }],
      specialtySlug: 'cardiologist', yearsOfExperience: 5, qualifications: [{ degree: 'MBBS', institution: 'KE' }],
      clinicName: 'Heart Clinic', clinicAddress: '12 Main Street', clinicCity: 'Lahore', clinicPhone: '+923001119991',
      consultationFee: 1000, availability: [{ day: 1, startTime: '9:00 AM', endTime: '1:00 PM' }],
    });
    const a1 = (await services.applications.createApplication(application(1))).application;
    const a2 = (await services.applications.createApplication(application(2))).application;

    script = [toolCall('listDoctorApplications', {}), say('Two pending.')];
    await chatAs(U.admin, 'List pending doctor applications');
    expect(toolResult().total).toBe(2);

    calls.length = 0;
    script = [toolCall('approveApplication', { applicationId: a1.id }), say('Confirm.')];
    const approve = await chatAs(U.admin, 'Approve application of App1');
    await pendingActions.confirm(confirmationOf(approve).data.actionId, U.admin);
    expect((await models.User.findById(a1.userId)).isActive).toBe(true);

    // Rejection needs a reason.
    calls.length = 0;
    script = [toolCall('rejectApplication', { applicationId: a2.id }), say('Need a reason.')];
    await chatAs(U.admin, 'Reject application of App2');
    expect(toolResult()).toMatchObject({ ok: false });

    calls.length = 0;
    script = [toolCall('rejectApplication', { applicationId: a2.id, reason: 'Incomplete license documents' }), say('Confirm.')];
    const reject = await chatAs(U.admin, 'Reject application of App2, reason incomplete license documents');
    await pendingActions.confirm(confirmationOf(reject).data.actionId, U.admin);
    expect((await models.User.findById(a2.userId)).isActive).toBe(false);

    // Already decided applications cannot be approved again.
    calls.length = 0;
    script = [toolCall('approveApplication', { applicationId: a1.id }), say('Already done.')];
    await chatAs(U.admin, 'Approve application of App1');
    expect(toolResult().error).toMatch(/already approved/i);
  });

  guard('orders and reports match the data, and invalid status moves are refused', async () => {
    const item = { medicineId: new mongoose.Types.ObjectId(), pharmacyId: new mongoose.Types.ObjectId(), quantity: 1, unitPrice: 100 };
    const order = (n, status, totalAmount) => ({
      orderRef: `ORD-T${n}`, items: [item], deliveryType: 'home_delivery', address: 'Somewhere 123',
      paymentMethod: 'cod', patientName: `P${n}`, status, totalAmount,
    });
    const [placed] = await models.MedicineOrder.create([order(1, 'placed', 1000), order(2, 'delivered', 2000), order(3, 'cancelled', 500)]);

    script = [toolCall('getOrdersReport', {}), say('Report ready.')];
    const report = await chatAs(U.admin, 'Show the orders report');
    expect(toolResult()).toMatchObject({ ok: true, totalOrders: 3, orderValueExcludingCancelled: 3000, deliveredValue: 2000 });
    expect(block(report, 'STATS')).toBeTruthy();

    calls.length = 0;
    script = [toolCall('getRevenueReport', {}), say('Revenue ready.')];
    await chatAs(U.admin, 'Revenue report');
    // 3000 medicine orders + 0 labs + 1500 (the one completed consultation from the doctor tests)
    expect(toolResult()).toMatchObject({ ok: true, totalBookingValue: 4500 });
    expect(toolResult().medicines.amount).toBe(3000);
    expect(toolResult().consultations.estimatedFees).toBe(1500);

    calls.length = 0;
    script = [toolCall('searchOrders', { status: 'delivered' }), say('One delivered.')];
    await chatAs(U.admin, 'Show delivered orders');
    expect(toolResult()).toMatchObject({ total: 1 });

    calls.length = 0;
    script = [toolCall('updateOrderStatus', { orderId: placed.id, status: 'delivered' }), say('Not allowed.')];
    await chatAs(U.admin, 'Mark the order delivered');
    expect(toolResult().error).toMatch(/cannot move/i);

    calls.length = 0;
    script = [toolCall('updateOrderStatus', { orderId: placed.id, status: 'confirmed' }), say('Confirm.')];
    const move = await chatAs(U.admin, 'Update the order to confirmed');
    await pendingActions.confirm(confirmationOf(move).data.actionId, U.admin);
    expect((await models.MedicineOrder.findById(placed.id)).status).toBe('confirmed');
  });

  guard('rejects absurd report ranges', async () => {
    script = [toolCall('getUsersReport', { from: '2000-01-01', to: '2026-01-01' }), say('Too long.')];
    await chatAs(U.admin, 'Users report');
    expect(toolResult().error).toMatch(/cannot exceed/i);
  });
});

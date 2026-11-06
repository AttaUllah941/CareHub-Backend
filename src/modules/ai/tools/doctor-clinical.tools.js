const { z } = require('zod');
const { BadRequestError, NotFoundError } = require('../../../core/errors/AppError');
const prescriptionsService = require('../../prescriptions/prescriptions.service');
const { createPrescriptionSchema } = require('../../prescriptions/prescriptions.validator');
const { defineTool } = require('./tool.registry');
const { objectId, searchTextSchema, limitSchema, truncate, formatDateTime, parseOrThrow } = require('./tool.helpers');
const { getDoctor, fetchMyAppointments, patientsFromAppointments } = require('./doctor-context');
const ui = require('./ui.helpers');

/**
 * Data-access rule for every tool in this file: a patient is visible to a doctor ONLY through that
 * doctor's own appointments. Unknown ids and other doctors' patients both look like "not found",
 * so nothing is revealed about patients the doctor has no relationship with.
 */
const requirePatient = async (ctx, patientId) => {
  const appointments = await fetchMyAppointments(ctx.user);
  const patient = patientsFromAppointments(appointments).get(patientId);
  if (!patient) throw new NotFoundError('No patient with that id has an appointment with you.');
  return { patient, appointments: appointments.filter((item) => item.patientId === patientId) };
};

const medicineLines = (medicines) =>
  medicines.map((m) => [m.name, m.dosage, m.duration].filter(Boolean).join(' · '));

const listMyPatients = defineTool({
  name: 'listMyPatients',
  agent: 'DOCTOR',
  intent: 'patients',
  description: "List patients who have had appointments with this doctor (name, visits, last/next visit). Optionally filter by name.",
  schema: z.object({ search: searchTextSchema.optional(), limit: limitSchema(15, 10) }),
  execute: async ({ search, limit }, ctx) => {
    const appointments = await fetchMyAppointments(ctx.user);
    const needle = search?.toLowerCase();
    const patients = [...patientsFromAppointments(appointments).values()]
      .filter((patient) => !needle || patient.name.toLowerCase().includes(needle))
      .sort((a, b) => new Date(b.lastVisit || 0) - new Date(a.lastVisit || 0))
      .slice(0, limit ?? 10);

    return {
      data: {
        total: patients.length,
        patients: patients.map((p) => ({ id: p.id, name: p.name, visits: p.visits, lastVisit: p.lastVisit, nextVisit: p.nextVisit })),
      },
      actions: patients.length
        ? [
            ui.list(
              'Your patients',
              patients.map((p) => ({
                id: p.id,
                title: p.name,
                subtitle: `${p.visits} appointment${p.visits === 1 ? '' : 's'}${p.lastVisit ? ` · last ${formatDateTime(p.lastVisit)}` : ''}`,
                lines: [p.nextVisit ? `Next: ${formatDateTime(p.nextVisit)}` : ''],
                actions: [{ label: 'View history', message: `Show the history of patient ${p.name} (patient id ${p.id}).` }],
              })),
            ),
          ]
        : [],
    };
  },
});

const getPatientHistory = defineTool({
  name: 'getPatientHistory',
  agent: 'DOCTOR',
  intent: 'patients',
  description:
    "Appointment history with this doctor and the prescriptions THIS doctor wrote for one of their patients. Only works for patients the doctor has appointments with.",
  schema: z.object({ patientId: objectId('patientId') }),
  execute: async ({ patientId }, ctx) => {
    const { patient, appointments } = await requirePatient(ctx, patientId);
    const doctor = await getDoctor(ctx);
    const { prescriptions } = await prescriptionsService.listForDoctor(doctor, { page: 1, limit: 100, sortBy: 'createdAt', sortOrder: 'desc' });
    const mine = prescriptions.filter((item) => item.patientId === patientId).slice(0, 10);

    return {
      data: {
        patient: { id: patient.id, name: patient.name, phone: patient.phone },
        appointments: appointments.slice(0, 15).map((a) => ({ at: formatDateTime(a.scheduledAt), type: a.consultationType, status: a.status })),
        prescriptions: mine.map((p) => ({ date: p.createdAt, diagnosis: p.diagnosis, medicines: medicineLines(p.medicines) })),
      },
      actions: [
        ui.table(
          `${patient.name} — appointments with you`,
          ['When', 'Type', 'Status'],
          appointments.slice(0, 15).map((a) => [formatDateTime(a.scheduledAt), a.consultationType === 'video' ? 'Video' : 'Clinic', a.status]),
        ),
        ...(mine.length
          ? [ui.list('Your prescriptions for this patient', mine.map((p) => ({ id: p.id, title: truncate(p.diagnosis, 80), subtitle: formatDateTime(p.createdAt), lines: medicineLines(p.medicines) })))]
          : []),
      ],
    };
  },
});

const listPrescriptions = defineTool({
  name: 'listPrescriptions',
  agent: 'DOCTOR',
  intent: 'prescriptions',
  description: 'List prescriptions written by this doctor, optionally for one patient.',
  schema: z.object({ patientId: objectId('patientId').optional(), limit: limitSchema(15, 8) }),
  execute: async ({ patientId, limit }, ctx) => {
    const doctor = await getDoctor(ctx);
    const { prescriptions } = await prescriptionsService.listForDoctor(doctor, { page: 1, limit: 100, sortBy: 'createdAt', sortOrder: 'desc' });
    const rows = prescriptions.filter((item) => !patientId || item.patientId === patientId).slice(0, limit ?? 8);
    return {
      data: { total: rows.length, prescriptions: rows.map((p) => ({ id: p.id, patient: p.patientName, diagnosis: p.diagnosis, date: p.createdAt, medicines: medicineLines(p.medicines) })) },
      actions: rows.length
        ? [ui.list('Prescriptions', rows.map((p) => ({ id: p.id, title: p.patientName, subtitle: `${formatDateTime(p.createdAt)} · ${truncate(p.diagnosis, 60)}`, lines: medicineLines(p.medicines) })))]
        : [],
    };
  },
});

const draftPrescription = defineTool({
  name: 'draftPrescription',
  agent: 'DOCTOR',
  intent: 'prescriptions',
  requiresConfirmation: true,
  description:
    'Prepare a prescription DRAFT for the doctor to review and then save. Use ONLY the diagnosis, medicines, dosage and duration the doctor stated in this conversation — ' +
    'never choose, add or change a diagnosis, drug or dose yourself. If anything is missing, ask the doctor. Nothing is saved until the doctor confirms the card.',
  schema: z.object({
    patientId: objectId('patientId').optional().describe('Id of an existing patient of this doctor'),
    patientName: z.string().trim().min(2).max(100).optional().describe('Only for a patient without an account'),
    diagnosis: z.string().trim().min(2).max(500),
    medicines: z
      .array(z.object({ name: z.string().trim().min(1).max(200), dosage: z.string().trim().max(200).optional(), duration: z.string().trim().max(200).optional() }))
      .min(1)
      .max(20),
    notes: z.string().trim().max(2000).optional(),
  }),
  prepare: async (args, ctx) => {
    let patientName = args.patientName;

    if (args.patientId) {
      const { patient, appointments } = await requirePatient(ctx, args.patientId);
      const related = appointments.some((item) => ['confirmed', 'completed'].includes(item.status));
      if (!related) {
        throw new BadRequestError('You can only prescribe to patients with a confirmed or completed appointment with you.');
      }
      patientName = patient.name; // taken from the record, never from the model
    }
    if (!patientName) throw new BadRequestError('Which patient is this prescription for?');

    const payload = parseOrThrow(createPrescriptionSchema, {
      patientId: args.patientId,
      patientName,
      diagnosis: args.diagnosis,
      medicines: args.medicines,
      notes: args.notes,
    });

    return {
      args: payload,
      summary: `Save this prescription for ${payload.patientName}? Please review it carefully — it will appear in the patient's records.`,
      details: [
        { label: 'Patient', value: payload.patientName },
        { label: 'Diagnosis', value: payload.diagnosis },
        ...payload.medicines.map((m, index) => ({
          label: `Medicine ${index + 1}`,
          value: [m.name, m.dosage, m.duration].filter(Boolean).join(' · '),
        })),
        ...(payload.notes ? [{ label: 'Notes', value: payload.notes }] : []),
      ],
    };
  },
  execute: async (args, ctx) => {
    const doctor = await getDoctor(ctx);
    const payload = parseOrThrow(createPrescriptionSchema, args);
    const { prescription } = await prescriptionsService.createForDoctor(doctor, payload);
    return {
      data: { prescriptionId: prescription.id },
      actions: [ui.list('Prescription saved', [{ id: prescription.id, title: prescription.patientName, subtitle: prescription.diagnosis, lines: medicineLines(prescription.medicines) }])],
      outcome: 'The prescription has been saved.',
    };
  },
});

module.exports = [listMyPatients, getPatientHistory, listPrescriptions, draftPrescription];

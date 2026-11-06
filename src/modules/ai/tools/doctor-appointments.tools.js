const { z } = require('zod');
const { BadRequestError, NotFoundError } = require('../../../core/errors/AppError');
const appointmentsService = require('../../appointments/appointments.service');
const { defineTool } = require('./tool.registry');
const { objectId, limitSchema, formatDateTime } = require('./tool.helpers');
const { fetchMyAppointments, clinicDate } = require('./doctor-context');
const ui = require('./ui.helpers');

const typeLabel = (type) => (type === 'video' ? 'Video' : 'Clinic');

/** Row actions only send chat messages; the confirmation gate still applies to every change. */
const rowActions = (appointment) => {
  const ref = `${appointment.bookingRef || ''} (appointment id ${appointment.id})`.trim();
  if (appointment.status === 'pending') {
    return [
      { label: 'Confirm', message: `Confirm appointment ${ref}.` },
      { label: 'Reject', message: `Reject appointment ${ref}.` },
    ];
  }
  if (appointment.status === 'confirmed') {
    return [{ label: 'Mark completed', message: `Mark appointment ${ref} as completed.` }];
  }
  return [];
};

const toItem = (appointment) => ({
  id: appointment.id,
  title: appointment.patientName || 'Patient',
  subtitle: `${formatDateTime(appointment.scheduledAt)} · ${typeLabel(appointment.consultationType)}`,
  badge: appointment.status,
  lines: [appointment.bookingRef ? `Ref ${appointment.bookingRef}` : '', appointment.patientPhone],
  actions: rowActions(appointment),
});

const findOwn = async (user, appointmentId) => {
  const appointments = await fetchMyAppointments(user);
  const appointment = appointments.find((item) => item.id === appointmentId);
  if (!appointment) throw new NotFoundError('Appointment not found among your appointments.');
  return appointment;
};

const listAppointments = defineTool({
  name: 'listAppointments',
  agent: 'DOCTOR',
  intent: 'appointments',
  description:
    "List the doctor's own appointments: today (default), upcoming, past or all, optionally filtered by status. " +
    'Use for "today\'s appointments", "pending requests", "my schedule for tomorrow" etc.',
  schema: z.object({
    when: z.enum(['today', 'upcoming', 'past', 'all']).optional(),
    date: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('A specific date YYYY-MM-DD; overrides "when"'),
    status: z.enum(['pending', 'confirmed', 'completed', 'cancelled', 'rejected']).optional(),
    limit: limitSchema(20, 10),
  }),
  execute: async (args, ctx) => {
    const when = args.when || 'today';
    const upcoming = when === 'upcoming' || when === 'today' || Boolean(args.date);
    const all = await fetchMyAppointments(ctx.user, {
      status: args.status,
      sortOrder: upcoming ? 'asc' : 'desc',
    });

    const today = clinicDate(new Date());
    const now = Date.now();
    const filtered = all.filter((appointment) => {
      if (args.date) return clinicDate(appointment.scheduledAt) === args.date;
      const day = clinicDate(appointment.scheduledAt);
      if (when === 'today') return day === today;
      if (when === 'upcoming') return new Date(appointment.scheduledAt).getTime() >= now;
      if (when === 'past') return new Date(appointment.scheduledAt).getTime() < now;
      return true;
    });

    const items = filtered.slice(0, args.limit ?? 10);
    const heading = args.date ? `Appointments on ${args.date}` : { today: "Today's appointments", upcoming: 'Upcoming appointments', past: 'Past appointments', all: 'All appointments' }[when];

    return {
      data: {
        total: filtered.length,
        shown: items.length,
        appointments: items.map((a) => ({
          id: a.id,
          bookingRef: a.bookingRef,
          patient: a.patientName,
          at: formatDateTime(a.scheduledAt),
          type: a.consultationType,
          status: a.status,
        })),
      },
      actions: items.length ? [ui.list(heading, items.map(toItem))] : [],
    };
  },
});

const confirmAppointment = defineTool({
  name: 'confirmAppointment',
  agent: 'DOCTOR',
  intent: 'appointments',
  requiresConfirmation: true,
  description: 'Propose confirming a PENDING appointment request. The doctor must confirm the card.',
  schema: z.object({ appointmentId: objectId('appointmentId') }),
  prepare: async ({ appointmentId }, ctx) => {
    const appointment = await findOwn(ctx.user, appointmentId);
    if (appointment.status !== 'pending') {
      throw new BadRequestError(`Only pending requests can be confirmed (this one is ${appointment.status}).`);
    }
    return {
      args: { appointmentId },
      summary: `Confirm ${appointment.patientName || 'the patient'}'s ${typeLabel(appointment.consultationType).toLowerCase()} appointment on ${formatDateTime(appointment.scheduledAt)}. The patient will be notified.`,
    };
  },
  execute: async ({ appointmentId }, ctx) => {
    const { appointment } = await appointmentsService.confirmAppointment(appointmentId, ctx.user);
    return {
      data: { status: appointment.status },
      actions: [ui.list('Appointment confirmed', [toItem(appointment)])],
      outcome: `Confirmed. ${appointment.patientName || 'The patient'} has been notified.`,
    };
  },
});

const rejectAppointment = defineTool({
  name: 'rejectAppointment',
  agent: 'DOCTOR',
  intent: 'appointments',
  requiresConfirmation: true,
  description: 'Propose rejecting a PENDING appointment request, with an optional reason shown to the patient. The doctor must confirm.',
  schema: z.object({
    appointmentId: objectId('appointmentId'),
    reason: z.string().trim().min(3).max(500).optional(),
  }),
  prepare: async ({ appointmentId, reason }, ctx) => {
    const appointment = await findOwn(ctx.user, appointmentId);
    if (appointment.status !== 'pending') {
      throw new BadRequestError(`Only pending requests can be rejected (this one is ${appointment.status}).`);
    }
    return {
      args: { appointmentId, reason },
      summary: `Reject ${appointment.patientName || 'the patient'}'s appointment on ${formatDateTime(appointment.scheduledAt)}.`,
      details: reason ? [{ label: 'Reason sent to patient', value: reason }] : [],
    };
  },
  execute: async ({ appointmentId, reason }, ctx) => {
    const { appointment } = await appointmentsService.rejectAppointment(appointmentId, ctx.user, reason);
    return {
      data: { status: appointment.status },
      actions: [ui.list('Appointment rejected', [toItem(appointment)])],
      outcome: 'Rejected. The patient has been notified.',
    };
  },
});

const completeAppointment = defineTool({
  name: 'completeAppointment',
  agent: 'DOCTOR',
  intent: 'appointments',
  requiresConfirmation: true,
  description: 'Propose marking a CONFIRMED appointment as completed. The doctor must confirm.',
  schema: z.object({ appointmentId: objectId('appointmentId') }),
  prepare: async ({ appointmentId }, ctx) => {
    const appointment = await findOwn(ctx.user, appointmentId);
    if (appointment.status !== 'confirmed') {
      throw new BadRequestError(`Only confirmed appointments can be completed (this one is ${appointment.status}).`);
    }
    return {
      args: { appointmentId },
      summary: `Mark the appointment with ${appointment.patientName || 'the patient'} (${formatDateTime(appointment.scheduledAt)}) as completed.`,
    };
  },
  execute: async ({ appointmentId }, ctx) => {
    const { appointment } = await appointmentsService.completeAppointment(appointmentId, ctx.user);
    return {
      data: { status: appointment.status },
      actions: [ui.list('Appointment completed', [toItem(appointment)])],
      outcome: 'Marked as completed.',
    };
  },
});

module.exports = [listAppointments, confirmAppointment, rejectAppointment, completeAppointment];

const { z } = require('zod');
const { BadRequestError, NotFoundError } = require('../../../core/errors/AppError');
const doctorsService = require('../../doctors/doctors.service');
const schedulesService = require('../../schedules/schedules.service');
const appointmentsService = require('../../appointments/appointments.service');
const { createAppointmentSchema } = require('../../appointments/appointments.validator');
const { slotToInstant } = require('../../../shared/utils/timeSlots.util');
const { defineTool } = require('./tool.registry');
const {
  objectId,
  dateSchema,
  limitSchema,
  pkr,
  formatDate,
  formatDateTime,
  normalizeTimeLabel,
  parseOrThrow,
} = require('./tool.helpers');

const ACTIVE = ['pending', 'confirmed'];

const nameOf = (doctor) => {
  const full = `${doctor.user?.firstName || ''} ${doctor.user?.lastName || ''}`.trim();
  return full ? `Dr. ${full}` : doctor.title || 'Doctor';
};

const compactAppointment = (appointment) => ({
  id: appointment.id,
  bookingRef: appointment.bookingRef,
  doctorId: appointment.doctorId,
  doctorName: appointment.doctorName,
  scheduledAt: appointment.scheduledAt,
  scheduledLabel: formatDateTime(appointment.scheduledAt),
  status: appointment.status,
  consultationType: appointment.consultationType,
  cancellable: ACTIVE.includes(appointment.status),
});

const checkAvailability = defineTool({
  name: 'checkAvailability',
  agent: 'PATIENT',
  intent: 'appointments',
  description:
    'List the open appointment time slots of a doctor on a date. Always call this before proposing a booking time.',
  schema: z.object({
    doctorId: objectId('doctorId'),
    date: dateSchema.describe('Date in YYYY-MM-DD (Pakistan time)'),
  }),
  execute: async ({ doctorId, date }) => {
    const [availability, { doctor }] = await Promise.all([
      schedulesService.getAvailability(doctorId, date),
      doctorsService.getPublicDoctorById(doctorId),
    ]);
    const open = availability.slots.filter((slot) => slot.available);
    const doctorLabel = nameOf(doctor);

    return {
      data: {
        doctor: doctorLabel,
        date,
        consultationFee: doctor.consultationFee,
        openSlots: open.slice(0, 24).map((slot) => slot.timeSlot),
        note: open.length ? undefined : 'No open slots on this date. Suggest another date.',
      },
      actions: [
        {
          type: 'AVAILABILITY',
          data: {
            doctorId,
            doctorName: doctorLabel,
            date,
            dateLabel: formatDate(date),
            slots: open.slice(0, 24).map((slot) => ({
              time: slot.timeSlot,
              consultationType: slot.consultationType,
            })),
          },
        },
      ],
    };
  },
});

const listMyAppointments = defineTool({
  name: 'listMyAppointments',
  agent: 'PATIENT',
  intent: 'appointments',
  description:
    "List the signed-in patient's own appointments, optionally only upcoming ones, by status, or by booking reference. Use to check an appointment's status.",
  schema: z.object({
    status: z.enum(['pending', 'confirmed', 'completed', 'cancelled', 'rejected']).optional(),
    upcomingOnly: z.boolean().optional(),
    bookingRef: z.string().trim().min(3).max(40).optional(),
    limit: limitSchema(20, 10),
  }),
  execute: async (args, ctx) => {
    const upcoming = args.upcomingOnly === true;
    const { appointments } = await appointmentsService.listPatientAppointments(ctx.user, {
      status: args.status,
      page: 1,
      limit: 50,
      sortBy: 'scheduledAt',
      sortOrder: upcoming ? 'asc' : 'desc',
    });

    const now = Date.now();
    const items = appointments
      .filter((appointment) => !upcoming || (ACTIVE.includes(appointment.status) && new Date(appointment.scheduledAt) >= now))
      .filter((appointment) => !args.bookingRef || appointment.bookingRef?.toLowerCase() === args.bookingRef.toLowerCase())
      .slice(0, args.limit ?? 10)
      .map(compactAppointment);

    return {
      data: { total: items.length, appointments: items },
      actions: items.length ? [{ type: 'APPOINTMENTS', data: { appointments: items } }] : [],
    };
  },
});

const bookAppointment = defineTool({
  name: 'bookAppointment',
  agent: 'PATIENT',
  intent: 'appointments',
  requiresConfirmation: true,
  description:
    'Propose booking an appointment slot with a doctor. The user must confirm before anything is booked. ' +
    'Only call after the user chose a doctor, date, time and consultation type, and after checkAvailability showed the slot is open.',
  schema: z.object({
    doctorId: objectId('doctorId'),
    date: dateSchema,
    time: z.string().trim().min(4).max(10).describe('Slot label such as "10:30 AM"'),
    consultationType: z.enum(['clinic', 'video']),
  }),
  prepare: async (args) => {
    const label = normalizeTimeLabel(args.time);
    if (!label) throw new BadRequestError('Time must look like "10:30 AM".');

    const instant = slotToInstant(args.date, label);
    if (!instant || instant <= new Date()) {
      throw new BadRequestError('That date and time is not in the future.');
    }

    const [availability, { doctor }] = await Promise.all([
      schedulesService.getAvailability(args.doctorId, args.date),
      doctorsService.getPublicDoctorById(args.doctorId),
    ]);
    const slot = availability.slots.find((item) => item.timeSlot === label && item.available);
    if (!slot) {
      const alternatives = availability.slots.filter((item) => item.available).slice(0, 6).map((item) => item.timeSlot);
      throw new BadRequestError(
        alternatives.length
          ? `${label} is not available on ${args.date}. Open slots: ${alternatives.join(', ')}.`
          : `There are no open slots on ${args.date}.`,
      );
    }

    const doctorLabel = nameOf(doctor);
    return {
      args: {
        doctorId: args.doctorId,
        scheduledAt: instant.toISOString(),
        consultationType: args.consultationType,
      },
      summary:
        `Book a ${args.consultationType} appointment with ${doctorLabel} on ${formatDateTime(instant.toISOString())} ` +
        `(consultation fee ${pkr(doctor.consultationFee, doctor.currency)}).`,
    };
  },
  execute: async (args, ctx) => {
    // Reuse the existing request validation and booking rules (future date, duplicates, slot taken).
    const payload = parseOrThrow(createAppointmentSchema, args);
    const { appointment } = await appointmentsService.createAppointment(payload, ctx.user);
    return {
      data: { appointment: compactAppointment(appointment) },
      actions: [{ type: 'APPOINTMENTS', data: { appointments: [compactAppointment(appointment)], heading: 'Appointment requested' } }],
      outcome: `Your appointment request was sent (ref ${appointment.bookingRef}). The doctor will confirm it soon.`,
    };
  },
});

const cancelAppointment = defineTool({
  name: 'cancelAppointment',
  agent: 'PATIENT',
  intent: 'appointments',
  requiresConfirmation: true,
  description:
    "Propose cancelling one of the patient's own pending or confirmed appointments. The user must confirm. Use listMyAppointments first to get the appointment id.",
  schema: z.object({ appointmentId: objectId('appointmentId') }),
  prepare: async ({ appointmentId }, ctx) => {
    const { appointments } = await appointmentsService.listPatientAppointments(ctx.user, {
      page: 1,
      limit: 100,
      sortBy: 'scheduledAt',
      sortOrder: 'desc',
    });
    const appointment = appointments.find((item) => item.id === appointmentId);
    if (!appointment) throw new NotFoundError('Appointment not found in your appointments.');
    if (!ACTIVE.includes(appointment.status)) {
      throw new BadRequestError(`This appointment is already ${appointment.status} and cannot be cancelled.`);
    }
    return {
      args: { appointmentId },
      summary: `Cancel your appointment with ${appointment.doctorName || 'the doctor'} on ${formatDateTime(appointment.scheduledAt)} (ref ${appointment.bookingRef}).`,
    };
  },
  execute: async ({ appointmentId }, ctx) => {
    const { appointment } = await appointmentsService.cancelAppointment(appointmentId, ctx.user);
    return {
      data: { appointment: compactAppointment(appointment) },
      actions: [{ type: 'APPOINTMENTS', data: { appointments: [compactAppointment(appointment)], heading: 'Appointment cancelled' } }],
      outcome: 'Your appointment has been cancelled.',
    };
  },
});

module.exports = [checkAvailability, listMyAppointments, bookAppointment, cancelAppointment];

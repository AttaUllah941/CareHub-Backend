const { z } = require('zod');
const { BadRequestError, NotFoundError } = require('../../../core/errors/AppError');
const schedulesService = require('../../schedules/schedules.service');
const clinicsService = require('../../clinics/clinics.service');
const reportsService = require('../../reports/reports.service');
const { createScheduleSchema } = require('../../schedules/schedules.validator');
const { defineTool } = require('./tool.registry');
const { objectId, dateSchema, pkr, formatDate, parseOrThrow } = require('./tool.helpers');
const { getDoctor } = require('./doctor-context');
const ui = require('./ui.helpers');

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const timeSchema = z.string().trim().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use 24-hour HH:mm');

const rangeSchema = {
  from: dateSchema.optional().describe('Start date YYYY-MM-DD (default: 30 days ago)'),
  to: dateSchema.optional().describe('End date YYYY-MM-DD (default: today)'),
};

const describeSlot = (schedule) =>
  `${schedule.specificDate ? formatDate(schedule.specificDate) : `Every ${DAYS[schedule.dayOfWeek]}`} ${schedule.startTime}–${schedule.endTime}`;

const getSchedule = defineTool({
  name: 'getSchedule',
  agent: 'DOCTOR',
  intent: 'schedule',
  description: "Show the doctor's active availability schedule (weekly or specific-date slots).",
  schema: z.object({}),
  execute: async (_args, ctx) => {
    const doctor = await getDoctor(ctx);
    const { schedules } = await schedulesService.listMySchedules(doctor);
    return {
      data: {
        total: schedules.length,
        schedules: schedules.map((s) => ({
          id: s.id,
          when: describeSlot(s),
          slotMinutes: s.slotDurationMinutes,
          type: s.consultationType,
        })),
        note: schedules.length ? undefined : 'No schedules configured yet; patients see the default time slots.',
      },
      actions: schedules.length
        ? [
            ui.table(
              'Your availability',
              ['When', 'Slot', 'Type'],
              schedules.map((s) => [describeSlot(s), `${s.slotDurationMinutes} min`, s.consultationType === 'video' ? 'Video' : 'Clinic']),
            ),
          ]
        : [],
    };
  },
});

const addScheduleSlot = defineTool({
  name: 'addScheduleSlot',
  agent: 'DOCTOR',
  intent: 'schedule',
  requiresConfirmation: true,
  description:
    'Propose adding an availability slot: either a weekly day (dayOfWeek 0=Sunday…6=Saturday) or one specificDate, ' +
    'with start/end times, slot length and clinic or video type. The doctor must confirm.',
  schema: z.object({
    dayOfWeek: z.number().int().min(0).max(6).optional(),
    specificDate: dateSchema.optional(),
    startTime: timeSchema,
    endTime: timeSchema,
    slotDurationMinutes: z.number().int().min(5).max(240).optional(),
    consultationType: z.enum(['clinic', 'video']),
    clinicId: objectId('clinicId').optional(),
  }),
  prepare: async (args, ctx) => {
    const doctor = await getDoctor(ctx);
    let clinicId = args.consultationType === 'clinic' ? args.clinicId : undefined;
    let clinicName = '';

    if (args.consultationType === 'clinic') {
      const { clinics } = await clinicsService.listForDoctor(doctor);
      if (!clinicId) {
        if (clinics.length === 1) {
          clinicId = clinics[0].id;
        } else {
          throw new BadRequestError(
            clinics.length
              ? `Which clinic? ${clinics.map((clinic) => `${clinic.name} (id ${clinic.id})`).join('; ')}`
              : 'You have no active clinic. Add a clinic first.',
          );
        }
      }
      const clinic = clinics.find((item) => item.id === clinicId);
      if (!clinic) throw new NotFoundError('Clinic not found among your clinics.');
      clinicName = clinic.name;
    }

    const payload = parseOrThrow(createScheduleSchema, {
      clinicId: clinicId ?? null,
      dayOfWeek: args.dayOfWeek,
      specificDate: args.specificDate,
      startTime: args.startTime,
      endTime: args.endTime,
      slotDurationMinutes: args.slotDurationMinutes ?? 30,
      consultationType: args.consultationType,
    });

    return {
      args: payload,
      summary: `Add availability: ${describeSlot(payload)} · ${payload.slotDurationMinutes}-min slots · ${payload.consultationType === 'video' ? 'video' : `clinic (${clinicName})`}.`,
    };
  },
  execute: async (args, ctx) => {
    const doctor = await getDoctor(ctx);
    const payload = parseOrThrow(createScheduleSchema, args);
    const { schedule } = await schedulesService.createSchedule(doctor, payload);
    return {
      data: { scheduleId: schedule.id },
      actions: [ui.table('Availability added', ['When', 'Slot'], [[describeSlot(schedule), `${schedule.slotDurationMinutes} min`]])],
      outcome: 'Your availability has been updated.',
    };
  },
});

const removeScheduleSlot = defineTool({
  name: 'removeScheduleSlot',
  agent: 'DOCTOR',
  intent: 'schedule',
  requiresConfirmation: true,
  description: 'Propose removing (deactivating) one of the doctor\'s availability slots. Use getSchedule first to get the id. The doctor must confirm.',
  schema: z.object({ scheduleId: objectId('scheduleId') }),
  prepare: async ({ scheduleId }, ctx) => {
    const doctor = await getDoctor(ctx);
    const { schedules } = await schedulesService.listMySchedules(doctor);
    const schedule = schedules.find((item) => item.id === scheduleId);
    if (!schedule) throw new NotFoundError('Schedule not found among your active schedules.');
    return { args: { scheduleId }, summary: `Remove availability: ${describeSlot(schedule)}.` };
  },
  execute: async ({ scheduleId }, ctx) => {
    const doctor = await getDoctor(ctx);
    await schedulesService.deactivateSchedule(doctor, scheduleId);
    return { data: { removed: true }, outcome: 'That availability slot was removed.' };
  },
});

const getAppointmentAnalytics = defineTool({
  name: 'getAppointmentAnalytics',
  agent: 'DOCTOR',
  intent: 'analytics',
  description: "Appointment statistics for the doctor's own practice over a date range (status mix, video vs clinic, completion rate, daily counts).",
  schema: z.object(rangeSchema),
  execute: async (args, ctx) => {
    const doctor = await getDoctor(ctx);
    const report = await reportsService.doctorAppointmentStats(doctor, args);
    const s = report.byStatus;
    return {
      data: report,
      actions: [
        ui.stats(`Appointments · ${report.range.from} to ${report.range.to}`, [
          { label: 'Total', value: report.total },
          { label: 'Completed', value: s.completed || 0 },
          { label: 'Pending', value: s.pending || 0 },
          { label: 'Confirmed', value: s.confirmed || 0 },
          { label: 'Cancelled / rejected', value: (s.cancelled || 0) + (s.rejected || 0) },
          { label: 'Completion rate', value: report.completionRate == null ? '—' : `${report.completionRate}%` },
          { label: 'Video', value: report.byType.video || 0 },
          { label: 'Clinic', value: report.byType.clinic || 0 },
        ]),
        ...(report.daily.length
          ? [ui.table('Busiest days', ['Date', 'Appointments', 'Completed'], [...report.daily].sort((a, b) => b.total - a.total).slice(0, 7).map((d) => [d.date, d.total, d.completed]))]
          : []),
      ],
    };
  },
});

const getEarnings = defineTool({
  name: 'getEarnings',
  agent: 'DOCTOR',
  intent: 'analytics',
  description:
    "The doctor's earnings: completed appointments × consultation fee for a range, all-time total, and expected from upcoming confirmed appointments.",
  schema: z.object(rangeSchema),
  execute: async (args, ctx) => {
    const doctor = await getDoctor(ctx);
    const report = await reportsService.doctorEarnings(doctor, args);
    return {
      data: report,
      actions: [
        ui.stats(`Earnings · ${report.range.from} to ${report.range.to}`, [
          { label: 'In this period', value: pkr(report.earningsInRange, report.currency), hint: `${report.completedInRange} completed visits` },
          { label: 'All time', value: pkr(report.earningsAllTime, report.currency), hint: `${report.completedAllTime} completed visits` },
          { label: 'Expected (confirmed)', value: pkr(report.expectedFromUpcoming, report.currency), hint: `${report.upcomingConfirmed} upcoming` },
          { label: 'Consultation fee', value: pkr(report.consultationFee, report.currency) },
        ]),
      ],
    };
  },
});

const getFollowUps = defineTool({
  name: 'getFollowUps',
  agent: 'DOCTOR',
  intent: 'followups',
  description:
    'Patients who may need a follow-up: their latest completed visit was a while ago and they have no upcoming appointment. Also reports pending appointment requests.',
  schema: z.object({
    minDaysSince: z.number().int().min(1).max(180).optional().describe('Minimum days since last visit (default 7)'),
  }),
  execute: async ({ minDaysSince }, ctx) => {
    const doctor = await getDoctor(ctx);
    const report = await reportsService.doctorFollowUps(doctor, { minDaysSince: minDaysSince ?? 7 });
    const items = report.followUps.slice(0, 15).map((patient) => ({
      id: patient.patientId,
      title: patient.patientName,
      subtitle: `Last visit ${patient.daysSinceLastVisit} days ago · ${patient.visits} visit${patient.visits === 1 ? '' : 's'}`,
      actions: [{ label: 'View history', message: `Show the history of patient ${patient.patientName} (patient id ${patient.patientId}).` }],
    }));
    return {
      data: {
        criteria: report.criteria,
        total: report.followUps.length,
        pendingRequests: report.pendingRequests,
        followUps: report.followUps.slice(0, 15).map(({ patientName, daysSinceLastVisit, visits }) => ({ patientName, daysSinceLastVisit, visits })),
      },
      actions: items.length ? [ui.list('Possible follow-ups', items)] : [],
    };
  },
});

module.exports = [getSchedule, addScheduleSlot, removeScheduleSlot, getAppointmentAnalytics, getEarnings, getFollowUps];

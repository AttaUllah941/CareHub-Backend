const { z } = require('zod');
const { CONSULTATION_TYPES } = require('./schedules.model');

const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Time must be in HH:mm format');

const createScheduleSchema = z
  .object({
    clinicId: z.string().min(1).nullable().optional(),
    dayOfWeek: z.number().int().min(0).max(6).optional(),
    specificDate: z.string().date().optional(),
    startTime: timeSchema,
    endTime: timeSchema,
    slotDurationMinutes: z.number().int().min(5).max(240).default(30),
    consultationType: z.enum(CONSULTATION_TYPES),
    isActive: z.boolean().optional(),
  })
  .refine((data) => (data.dayOfWeek != null) !== Boolean(data.specificDate), {
    message: 'Provide either dayOfWeek or specificDate, but not both',
    path: ['dayOfWeek'],
  })
  .refine((data) => data.startTime < data.endTime, {
    message: 'startTime must be before endTime',
    path: ['endTime'],
  })
  .refine(
    (data) =>
      (data.consultationType === 'video' && !data.clinicId) ||
      (data.consultationType === 'clinic' && Boolean(data.clinicId)),
    {
      message: 'clinicId is required for clinic schedules and must be omitted for video schedules',
      path: ['clinicId'],
    },
  );

module.exports = {
  createScheduleSchema,
};

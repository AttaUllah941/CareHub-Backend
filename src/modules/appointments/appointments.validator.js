const { z } = require('zod');
const { objectIdSchema, paginationQuerySchema, phoneSchema } = require('../../shared/utils/zodSchemas');
const { APPOINTMENT_STATUSES, CONSULTATION_TYPES } = require('./appointments.model');

const appointmentIdParamsSchema = z.object({
  id: objectIdSchema('appointment id'),
});

const createAppointmentSchema = z.object({
  doctorId: objectIdSchema('doctor id'),
  scheduledAt: z.string().datetime({ message: 'scheduledAt must be a valid ISO date-time' }),
  patientName: z.string().trim().min(2).max(100).optional(),
  patientEmail: z.string().trim().email().optional(),
  patientPhone: phoneSchema.optional(),
  consultationType: z.enum(CONSULTATION_TYPES).optional(),
});

const listAppointmentsQuerySchema = paginationQuerySchema.extend({
  status: z.enum(APPOINTMENT_STATUSES).optional(),
});

const rejectAppointmentSchema = z.object({
  rejectionReason: z.string().trim().min(3).max(500).optional(),
});

module.exports = {
  appointmentIdParamsSchema,
  createAppointmentSchema,
  listAppointmentsQuerySchema,
  rejectAppointmentSchema,
};

const { z } = require('zod');
const { CONSULTATION_TYPES } = require('./appointments.model');

const patientSnapshotSchema = z.object({
  name: z.string().trim().min(2).max(150),
  age: z.number().int().min(1).max(120),
  gender: z.string().trim().max(50).optional(),
  phone: z.string().trim().regex(/^\+?[1-9]\d{7,14}$/, 'Invalid phone number'),
  email: z.string().trim().email().optional().or(z.literal('')),
  notes: z.string().trim().max(2000).optional(),
});

const createAppointmentSchema = z
  .object({
    doctorId: z.string().min(1),
    clinicId: z.string().min(1).optional(),
    consultationType: z.enum(CONSULTATION_TYPES),
    date: z.string().date(),
    timeSlot: z.string().trim().min(1).max(20),
    city: z.string().trim().min(2).max(100),
    patient: patientSnapshotSchema,
  })
  .refine(
    (data) =>
      (data.consultationType === 'clinic' && Boolean(data.clinicId)) ||
      (data.consultationType === 'video' && !data.clinicId),
    {
      message: 'clinicId is required for clinic appointments and must be omitted for video',
      path: ['clinicId'],
    },
  );

const rejectAppointmentSchema = z.object({
  reason: z.string().trim().min(3).max(1000),
});

module.exports = {
  createAppointmentSchema,
  rejectAppointmentSchema,
};

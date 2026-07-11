const { z } = require('zod');
const { objectIdSchema, phoneSchema } = require('../../shared/utils/zodSchemas');
const { APPLICATION_STATUSES } = require('./doctor-applications.model');

const documentSchema = z.object({
  type: z.string().trim().min(1).max(100),
  url: z.string().trim().url().max(1000),
  mimeType: z.enum(['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']),
  size: z.number().int().min(1),
});

const qualificationSchema = z.object({
  degree: z.string().trim().min(1).max(200),
  institution: z.string().trim().min(1).max(200),
  year: z.number().int().min(1950).max(2100).optional(),
});

const availabilitySlotSchema = z.object({
  day: z.number().int().min(0).max(6),
  startTime: z.string().trim().min(1).max(20),
  endTime: z.string().trim().min(1).max(20),
});

const createApplicationSchema = z.object({
  firstName: z.string().trim().min(2).max(100),
  lastName: z.string().trim().min(2).max(100),
  email: z.string().trim().email(),
  phone: phoneSchema,
  password: z.string().min(8).max(128),
  documents: z.array(documentSchema).min(1).max(10),
  specialtySlug: z.string().trim().min(1).max(120),
  yearsOfExperience: z.number().min(0).max(80),
  qualifications: z.array(qualificationSchema).min(1).max(10),
  clinicName: z.string().trim().min(2).max(200),
  clinicAddress: z.string().trim().min(5).max(500),
  clinicCity: z.string().trim().min(2).max(100),
  clinicPhone: phoneSchema,
  consultationFee: z.number().min(1),
  videoConsultationFee: z.number().min(0).optional(),
  availability: z.array(availabilitySlotSchema).min(1).max(7),
});

const applicationIdParamsSchema = z.object({ id: objectIdSchema('application id') });

const listApplicationsQuerySchema = z.object({
  status: z.enum(APPLICATION_STATUSES).optional(),
});

const rejectApplicationParamsSchema = z.object({ id: objectIdSchema('application id') });
const rejectApplicationBodySchema = z.object({
  rejectionReason: z.string().trim().min(3).max(2000),
});

module.exports = {
  createApplicationSchema,
  applicationIdParamsSchema,
  listApplicationsQuerySchema,
  rejectApplicationParamsSchema,
  rejectApplicationBodySchema,
};

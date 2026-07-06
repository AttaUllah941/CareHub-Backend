const { z } = require('zod');
const { paginationQuerySchema, objectIdSchema } = require('../../shared/utils/zodSchemas');
const { GENDERS, VERIFICATION_STATUSES } = require('./doctors.model');

const qualificationSchema = z.object({
  degree: z.string().trim().min(1).max(200),
  institute: z.string().trim().min(1).max(200),
  year: z.number().int().min(1950).max(new Date().getFullYear()).optional(),
});

const workHistorySchema = z.object({
  position: z.string().trim().min(1).max(200),
  organization: z.string().trim().min(1).max(200),
  from: z.number().int().min(1950).max(new Date().getFullYear()).optional(),
  to: z.number().int().min(1950).max(new Date().getFullYear()).optional(),
});

const searchPublicQuerySchema = paginationQuerySchema.extend({
  city: z.string().trim().optional(),
  specialtySlug: z.string().trim().optional(),
  specialty: z.string().trim().optional(),
  search: z.string().trim().optional(),
  name: z.string().trim().optional(),
  minFee: z.coerce.number().min(0).optional(),
  maxFee: z.coerce.number().min(0).optional(),
});

const publicDoctorIdParamsSchema = z.object({
  id: objectIdSchema('id'),
});

const updateMyProfileSchema = z
  .object({
    title: z.string().trim().max(50).optional(),
    gender: z.enum(GENDERS).optional(),
    dateOfBirth: z.string().date().optional(),
    city: z.string().trim().max(100).optional(),
    bio: z.string().trim().max(2000).optional(),
    about: z.string().trim().max(5000).optional(),
    yearsOfExperience: z.number().int().min(0).max(80).optional(),
    licenseNumber: z.string().trim().max(100).optional(),
    licenseAuthority: z.string().trim().max(200).optional(),
    medicalRegistrationNumber: z.string().trim().max(100).optional(),
    qualifications: z.array(qualificationSchema).optional(),
    workHistory: z.array(workHistorySchema).optional(),
    specialtyIds: z.array(z.string().min(1)).optional(),
    languageIds: z.array(z.string().min(1)).optional(),
    consultationFee: z.number().min(0).optional(),
    currency: z.string().trim().max(10).optional(),
    profileImageUrl: z.string().trim().max(500).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required',
  });

const verificationSchema = z.object({
  status: z.enum(VERIFICATION_STATUSES),
  rejectionReason: z.string().trim().max(1000).optional(),
});

module.exports = {
  searchPublicQuerySchema,
  publicDoctorIdParamsSchema,
  updateMyProfileSchema,
  verificationSchema,
};

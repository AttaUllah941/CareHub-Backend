const { z } = require('zod');
const { objectIdSchema, paginationQuerySchema } = require('../../shared/utils/zodSchemas');

const locationSchema = z
  .object({
    coordinates: z.tuple([z.number(), z.number()]),
  })
  .nullable()
  .optional();

const hospitalBodySchema = z.object({
  name: z.string().trim().min(2).max(200).optional(),
  slug: z.string().trim().min(2).max(200).optional(),
  city: z.string().trim().min(2).max(100).optional(),
  citySlug: z.string().trim().min(2).max(100).optional(),
  description: z.string().trim().max(5000).optional(),
  address: z.string().trim().min(1).max(500).optional(),
  location: locationSchema,
  images: z.array(z.string().url()).max(20).optional(),
  facilities: z.array(z.string().trim().min(1).max(100)).max(50).optional(),
  doctorIds: z.array(objectIdSchema('doctorId')).max(500).optional(),
  rating: z.number().min(0).max(5).optional(),
  reviewCount: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

const createHospitalSchema = z.object({
  name: z.string().trim().min(2).max(200),
  city: z.string().trim().min(2).max(100),
  address: z.string().trim().min(1).max(500),
  slug: z.string().trim().min(2).max(200).optional(),
  citySlug: z.string().trim().min(2).max(100).optional(),
  description: z.string().trim().max(5000).optional(),
  location: locationSchema,
  images: z.array(z.string().url()).max(20).optional(),
  facilities: z.array(z.string().trim().min(1).max(100)).max(50).optional(),
  doctorIds: z.array(objectIdSchema('doctorId')).max(500).optional(),
  rating: z.number().min(0).max(5).optional(),
  reviewCount: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

const updateHospitalParamsSchema = z.object({ id: objectIdSchema('hospital id') });
const updateHospitalSchema = hospitalBodySchema;

const hospitalIdParamsSchema = z.object({ id: objectIdSchema('hospital id') });

const publicDetailParamsSchema = z.object({
  citySlug: z.string().trim().min(1),
  slug: z.string().trim().min(1),
});

const listPublicQuerySchema = paginationQuerySchema.extend({
  city: z.string().trim().min(2).max(100).optional(),
  citySlug: z.string().trim().min(2).max(100).optional(),
});

const linkDoctorParamsSchema = z.object({ id: objectIdSchema('hospital id') });
const linkDoctorBodySchema = z.object({ doctorId: objectIdSchema('doctorId') });

const unlinkDoctorParamsSchema = z.object({
  id: objectIdSchema('hospital id'),
  doctorId: objectIdSchema('doctor id'),
});

module.exports = {
  createHospitalSchema,
  updateHospitalParamsSchema,
  updateHospitalSchema,
  hospitalIdParamsSchema,
  publicDetailParamsSchema,
  listPublicQuerySchema,
  linkDoctorParamsSchema,
  linkDoctorBodySchema,
  unlinkDoctorParamsSchema,
};

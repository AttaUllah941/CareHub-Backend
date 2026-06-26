const { z } = require('zod');
const { objectIdSchema, phoneSchema } = require('../../shared/utils/zodSchemas');
const { COLLECTION_TYPES } = require('./lab-bookings.model');

const labBodySchema = z.object({
  name: z.string().trim().min(2).max(200).optional(),
  city: z.string().trim().min(2).max(100).optional(),
  address: z.string().trim().min(1).max(500).optional(),
  slug: z.string().trim().min(2).max(200).optional(),
  citySlug: z.string().trim().min(2).max(100).optional(),
  isActive: z.boolean().optional(),
});

const createLabSchema = z.object({
  name: z.string().trim().min(2).max(200),
  city: z.string().trim().min(2).max(100),
  address: z.string().trim().min(1).max(500),
  slug: z.string().trim().min(2).max(200).optional(),
  citySlug: z.string().trim().min(2).max(100).optional(),
  isActive: z.boolean().optional(),
});

const updateLabParamsSchema = z.object({ id: objectIdSchema('id') });
const updateLabSchema = labBodySchema;

const labIdParamsSchema = z.object({ id: objectIdSchema('id') });

const listPublicLabsQuerySchema = z.object({
  city: z.string().trim().min(2).max(100).optional(),
  citySlug: z.string().trim().min(2).max(100).optional(),
});

const listPublicTestsParamsSchema = z.object({ id: objectIdSchema('id') });
const listPublicTestsQuerySchema = z.object({
  search: z.string().trim().min(1).max(100).optional(),
});

const labTestBodySchema = z.object({
  name: z.string().trim().min(2).max(200).optional(),
  description: z.string().trim().max(5000).optional(),
  price: z.number().min(0).optional(),
  currency: z.string().trim().length(3).optional(),
  homeCollectionAvailable: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

const createLabTestParamsSchema = z.object({ labId: objectIdSchema('labId') });
const createLabTestBodySchema = z.object({
  name: z.string().trim().min(2).max(200),
  description: z.string().trim().max(5000).optional(),
  price: z.number().min(0),
  currency: z.string().trim().length(3).optional(),
  homeCollectionAvailable: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

const updateLabTestParamsSchema = z.object({
  labId: objectIdSchema('labId'),
  testId: objectIdSchema('testId'),
});
const updateLabTestSchema = labTestBodySchema;

const deleteLabTestParamsSchema = z.object({
  labId: objectIdSchema('labId'),
  testId: objectIdSchema('testId'),
});

const patientSnapshotSchema = z.object({
  name: z.string().trim().min(2).max(150),
  phone: phoneSchema,
  email: z.string().trim().email().optional(),
  address: z.string().trim().max(500).optional(),
});

const createBookingSchema = z.object({
  labId: objectIdSchema('labId'),
  testIds: z.array(objectIdSchema('testId')).min(1).max(20),
  scheduledDate: z.string().date(),
  scheduledSlot: z.string().trim().min(1).max(20),
  collectionType: z.enum(COLLECTION_TYPES),
  patient: patientSnapshotSchema,
});

const cancelBookingParamsSchema = z.object({ id: objectIdSchema('id') });

module.exports = {
  createLabSchema,
  updateLabParamsSchema,
  updateLabSchema,
  labIdParamsSchema,
  listPublicLabsQuerySchema,
  listPublicTestsParamsSchema,
  listPublicTestsQuerySchema,
  createLabTestParamsSchema,
  createLabTestBodySchema,
  updateLabTestParamsSchema,
  updateLabTestSchema,
  deleteLabTestParamsSchema,
  createBookingSchema,
  cancelBookingParamsSchema,
};

const { z } = require('zod');
const { objectIdSchema, phoneSchema } = require('../../shared/utils/zodSchemas');
const { CONSULTATION_STATUSES } = require('./surgery-consultation-requests.model');

const estimatedCostRangeSchema = z.object({
  min: z.number().min(0),
  max: z.number().min(0),
});

const estimatedCostRangeUpdateSchema = z.object({
  min: z.number().min(0).optional(),
  max: z.number().min(0).optional(),
});

const procedureBodySchema = z.object({
  name: z.string().trim().min(2).max(200).optional(),
  slug: z.string().trim().min(2).max(200).optional(),
  description: z.string().trim().max(5000).optional(),
  category: z.string().trim().min(2).max(100).optional(),
  currency: z.string().trim().length(3).optional(),
  hospitalIds: z.array(objectIdSchema('hospitalId')).max(100).optional(),
  isActive: z.boolean().optional(),
});

const createProcedureSchema = z.object({
  name: z.string().trim().min(2).max(200),
  category: z.string().trim().min(2).max(100),
  estimatedCostRange: estimatedCostRangeSchema,
  slug: z.string().trim().min(2).max(200).optional(),
  description: z.string().trim().max(5000).optional(),
  currency: z.string().trim().length(3).optional(),
  hospitalIds: z.array(objectIdSchema('hospitalId')).max(100).optional(),
  isActive: z.boolean().optional(),
});

const updateProcedureParamsSchema = z.object({ id: objectIdSchema('procedure id') });
const updateProcedureSchema = procedureBodySchema.extend({
  estimatedCostRange: estimatedCostRangeUpdateSchema.optional(),
});

const procedureIdParamsSchema = z.object({ id: objectIdSchema('procedure id') });

const listPublicProceduresQuerySchema = z.object({
  search: z.string().trim().min(1).max(100).optional(),
  category: z.string().trim().min(2).max(100).optional(),
});

const publicProcedureSlugParamsSchema = z.object({
  slug: z.string().trim().min(1),
});

const patientSnapshotSchema = z.object({
  name: z.string().trim().min(2).max(150),
  phone: phoneSchema,
  email: z.string().trim().email().optional(),
  notes: z.string().trim().max(2000).optional(),
});

const createConsultationRequestSchema = z.object({
  procedureId: objectIdSchema('procedureId'),
  hospitalId: objectIdSchema('hospitalId'),
  patient: patientSnapshotSchema,
});

const updateConsultationRequestStatusParamsSchema = z.object({
  id: objectIdSchema('consultation request id'),
});
const updateConsultationRequestStatusBodySchema = z.object({
  status: z.enum(CONSULTATION_STATUSES),
});

const listConsultationRequestsQuerySchema = z.object({
  status: z.enum(CONSULTATION_STATUSES).optional(),
});

module.exports = {
  createProcedureSchema,
  updateProcedureParamsSchema,
  updateProcedureSchema,
  procedureIdParamsSchema,
  listPublicProceduresQuerySchema,
  publicProcedureSlugParamsSchema,
  createConsultationRequestSchema,
  updateConsultationRequestStatusParamsSchema,
  updateConsultationRequestStatusBodySchema,
  listConsultationRequestsQuerySchema,
};

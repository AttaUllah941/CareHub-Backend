const { z } = require('zod');
const { objectIdSchema, phoneSchema } = require('../../shared/utils/zodSchemas');
const { APPLICATION_STATUSES } = require('./doctor-applications.model');

const documentSchema = z.object({
  type: z.string().trim().min(1).max(100),
  url: z.string().trim().url().max(1000),
  mimeType: z.enum(['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']),
  size: z.number().int().min(1),
});

const createApplicationSchema = z.object({
  firstName: z.string().trim().min(2).max(100),
  lastName: z.string().trim().min(2).max(100),
  email: z.string().trim().email(),
  phone: phoneSchema,
  password: z.string().min(8).max(128),
  documents: z.array(documentSchema).min(1).max(10),
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

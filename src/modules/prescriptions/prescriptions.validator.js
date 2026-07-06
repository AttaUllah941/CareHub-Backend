const { z } = require('zod');
const { objectIdSchema, paginationQuerySchema } = require('../../shared/utils/zodSchemas');

const medicineItemSchema = z.object({
  name: z.string().trim().min(1).max(200),
  dosage: z.string().trim().max(200).optional(),
  duration: z.string().trim().max(200).optional(),
});

const createPrescriptionSchema = z.object({
  patientName: z.string().trim().min(2).max(100),
  patientId: objectIdSchema('patient id').optional(),
  diagnosis: z.string().trim().min(2).max(500),
  medicines: z.array(medicineItemSchema).min(1).max(20),
  notes: z.string().trim().max(2000).optional(),
});

const listPrescriptionsQuerySchema = paginationQuerySchema;

module.exports = {
  createPrescriptionSchema,
  listPrescriptionsQuerySchema,
};

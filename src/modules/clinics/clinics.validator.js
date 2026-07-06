const { z } = require('zod');

const locationSchema = z
  .object({
    type: z.literal('Point').optional(),
    coordinates: z.tuple([z.number(), z.number()]),
  })
  .optional();

const createClinicSchema = z.object({
  name: z.string().trim().min(2).max(200),
  address: z.string().trim().min(5).max(500),
  city: z.string().trim().min(2).max(100),
  location: locationSchema,
  consultationFee: z.number().min(0).optional(),
});

const updateClinicSchema = z
  .object({
    name: z.string().trim().min(2).max(200).optional(),
    address: z.string().trim().min(5).max(500).optional(),
    city: z.string().trim().min(2).max(100).optional(),
    location: locationSchema,
    consultationFee: z.number().min(0).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required',
  });

module.exports = {
  createClinicSchema,
  updateClinicSchema,
};

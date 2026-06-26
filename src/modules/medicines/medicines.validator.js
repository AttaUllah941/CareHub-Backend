const { z } = require('zod');
const { objectIdSchema } = require('../../shared/utils/zodSchemas');
const { DELIVERY_TYPES, PAYMENT_METHODS, ORDER_STATUSES } = require('./medicine-orders.model');

const pharmacyBodySchema = z.object({
  name: z.string().trim().min(2).max(200).optional(),
  city: z.string().trim().min(2).max(100).optional(),
  address: z.string().trim().min(1).max(500).optional(),
  slug: z.string().trim().min(2).max(200).optional(),
  citySlug: z.string().trim().min(2).max(100).optional(),
  isActive: z.boolean().optional(),
});

const createPharmacySchema = z.object({
  name: z.string().trim().min(2).max(200),
  city: z.string().trim().min(2).max(100),
  address: z.string().trim().min(1).max(500),
  slug: z.string().trim().min(2).max(200).optional(),
  citySlug: z.string().trim().min(2).max(100).optional(),
  isActive: z.boolean().optional(),
});

const updatePharmacyParamsSchema = z.object({ id: objectIdSchema('id') });
const updatePharmacySchema = pharmacyBodySchema;

const pharmacyIdParamsSchema = z.object({ id: objectIdSchema('id') });

const medicineBodySchema = z.object({
  name: z.string().trim().min(2).max(200).optional(),
  description: z.string().trim().max(5000).optional(),
  manufacturer: z.string().trim().min(2).max(150).optional(),
  price: z.number().min(0).optional(),
  currency: z.string().trim().length(3).optional(),
  requiresPrescription: z.boolean().optional(),
  stock: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

const createMedicineParamsSchema = z.object({ pharmacyId: objectIdSchema('pharmacyId') });
const createMedicineBodySchema = z.object({
  name: z.string().trim().min(2).max(200),
  manufacturer: z.string().trim().min(2).max(150),
  price: z.number().min(0),
  description: z.string().trim().max(5000).optional(),
  currency: z.string().trim().length(3).optional(),
  requiresPrescription: z.boolean().optional(),
  stock: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

const updateMedicineParamsSchema = z.object({
  pharmacyId: objectIdSchema('pharmacyId'),
  medicineId: objectIdSchema('medicineId'),
});
const updateMedicineSchema = medicineBodySchema;

const deleteMedicineParamsSchema = z.object({
  pharmacyId: objectIdSchema('pharmacyId'),
  medicineId: objectIdSchema('medicineId'),
});

const listPublicMedicinesQuerySchema = z.object({
  search: z.string().trim().min(1).max(100).optional(),
  pharmacyId: objectIdSchema('pharmacyId').optional(),
  requiresPrescription: z.enum(['true', 'false']).optional(),
});

const medicineIdParamsSchema = z.object({ id: objectIdSchema('id') });

const orderItemSchema = z.object({
  medicineId: objectIdSchema('medicineId'),
  pharmacyId: objectIdSchema('pharmacyId'),
  quantity: z.number().int().min(1),
  unitPrice: z.number().min(0),
});

const createOrderSchema = z.object({
  items: z.array(orderItemSchema).min(1).max(50),
  deliveryType: z.enum(DELIVERY_TYPES),
  address: z.string().trim().min(1).max(500),
  paymentMethod: z.enum(PAYMENT_METHODS),
  couponCode: z.string().trim().max(50).optional(),
  prescriptionUrls: z.array(z.string().trim().url()).max(10).optional(),
});

const orderIdParamsSchema = z.object({ id: objectIdSchema('id') });

const updateOrderStatusParamsSchema = z.object({ id: objectIdSchema('id') });
const updateOrderStatusBodySchema = z.object({
  status: z.enum(ORDER_STATUSES),
});

module.exports = {
  createPharmacySchema,
  updatePharmacyParamsSchema,
  updatePharmacySchema,
  pharmacyIdParamsSchema,
  createMedicineParamsSchema,
  createMedicineBodySchema,
  updateMedicineParamsSchema,
  updateMedicineSchema,
  deleteMedicineParamsSchema,
  listPublicMedicinesQuerySchema,
  medicineIdParamsSchema,
  createOrderSchema,
  orderIdParamsSchema,
  updateOrderStatusParamsSchema,
  updateOrderStatusBodySchema,
};

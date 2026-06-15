const { body, param, query } = require('express-validator');
const { PHARMACY_ORDER_STATUS_VALUES } = require('../../../shared/enums/pharmacyOrderStatus.enum');
const { PRESCRIPTION_UPLOAD_STATUS_VALUES } = require('../../../shared/enums/prescriptionUploadStatus.enum');

const mongoId = (field) => param(field).isMongoId();

const listMedicinesQueryDto = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('search').optional().trim(),
  query('category').optional().trim(),
  query('requiresPrescription').optional().isBoolean(),
  query('isActive').optional().isBoolean(),
];

const createMedicineDto = [
  body('name').trim().notEmpty().isLength({ max: 200 }),
  body('genericName').optional().trim().isLength({ max: 200 }),
  body('brandName').optional().trim().isLength({ max: 200 }),
  body('strength').optional().trim().isLength({ max: 100 }),
  body('form').optional().isIn(['TABLET', 'CAPSULE', 'SYRUP', 'INJECTION', 'CREAM', 'DROPS', 'INHALER', 'OTHER']),
  body('unit').optional().trim().isLength({ max: 50 }),
  body('sku').optional().trim().isLength({ max: 100 }),
  body('category').optional().trim().isLength({ max: 100 }),
  body('requiresPrescription').optional().isBoolean(),
  body('description').optional().trim().isLength({ max: 2000 }),
  body('manufacturer').optional().trim().isLength({ max: 200 }),
  body('sellingPrice').optional().isFloat({ min: 0 }),
  body('currency').optional().trim().isLength({ max: 10 }),
];

const updateMedicineDto = [
  body('name').optional().trim().notEmpty().isLength({ max: 200 }),
  body('genericName').optional().trim().isLength({ max: 200 }),
  body('brandName').optional().trim().isLength({ max: 200 }),
  body('strength').optional().trim().isLength({ max: 100 }),
  body('form').optional().isIn(['TABLET', 'CAPSULE', 'SYRUP', 'INJECTION', 'CREAM', 'DROPS', 'INHALER', 'OTHER']),
  body('unit').optional().trim().isLength({ max: 50 }),
  body('sku').optional().trim().isLength({ max: 100 }),
  body('category').optional().trim().isLength({ max: 100 }),
  body('requiresPrescription').optional().isBoolean(),
  body('description').optional().trim().isLength({ max: 2000 }),
  body('manufacturer').optional().trim().isLength({ max: 200 }),
  body('sellingPrice').optional().isFloat({ min: 0 }),
  body('currency').optional().trim().isLength({ max: 10 }),
  body('isActive').optional().isBoolean(),
];

const upsertInventoryDto = [
  body('medicineId').isMongoId(),
  body('quantity').optional().isInt({ min: 0 }),
  body('reservedQuantity').optional().isInt({ min: 0 }),
  body('reorderLevel').optional().isInt({ min: 0 }),
  body('batchNumber').optional().trim().isLength({ max: 100 }),
  body('expiryDate').optional().isISO8601(),
  body('unitCost').optional().isFloat({ min: 0 }),
  body('sellingPrice').optional().isFloat({ min: 0 }),
];

const adjustInventoryDto = [
  body('adjustment').isInt(),
  body('reason').optional().trim().isLength({ max: 500 }),
];

const orderItemDto = [
  body('items').isArray({ min: 1 }),
  body('items.*.medicineId').isMongoId(),
  body('items.*.quantity').isInt({ min: 1 }),
  body('items.*.unitPrice').optional().isFloat({ min: 0 }),
  body('items.*.dosage').optional().trim().isLength({ max: 200 }),
  body('items.*.instructions').optional().trim().isLength({ max: 500 }),
];

const createOrderDto = [
  ...orderItemDto,
  body('prescriptionId').optional().isMongoId(),
  body('prescriptionUploadId').optional().isMongoId(),
  body('deliveryType').optional().isIn(['PICKUP', 'DELIVERY']),
  body('deliveryAddress').optional().trim().isLength({ max: 500 }),
  body('deliveryFee').optional().isFloat({ min: 0 }),
  body('notes').optional().trim().isLength({ max: 1000 }),
  body('currency').optional().trim().isLength({ max: 10 }),
];

const createOrderFromPrescriptionDto = [
  body('deliveryType').optional().isIn(['PICKUP', 'DELIVERY']),
  body('deliveryAddress').optional().trim().isLength({ max: 500 }),
  body('notes').optional().trim().isLength({ max: 1000 }),
];

const updateOrderStatusDto = [
  body('status').isIn(PHARMACY_ORDER_STATUS_VALUES),
  body('notes').optional().trim().isLength({ max: 1000 }),
];

const cancelOrderDto = [body('cancellationReason').optional().trim().isLength({ max: 500 })];

const reviewUploadDto = [
  body('status').isIn([PRESCRIPTION_UPLOAD_STATUS_VALUES[1], PRESCRIPTION_UPLOAD_STATUS_VALUES[2]]),
  body('reviewNotes').optional().trim().isLength({ max: 1000 }),
  body('prescriptionId').optional().isMongoId(),
];

const uploadPrescriptionDto = [body('title').optional().trim().isLength({ max: 200 })];

module.exports = {
  mongoId,
  listMedicinesQueryDto,
  createMedicineDto,
  updateMedicineDto,
  upsertInventoryDto,
  adjustInventoryDto,
  createOrderDto,
  createOrderFromPrescriptionDto,
  updateOrderStatusDto,
  cancelOrderDto,
  reviewUploadDto,
  uploadPrescriptionDto,
};

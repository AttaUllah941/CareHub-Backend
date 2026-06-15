const { Router } = require('express');
const container = require('../../../core/container');
const validate = require('../../../core/middleware/validate.middleware');
const { authenticate, authorize } = require('../../../core/middleware/auth.middleware');
const { uploadPrescriptionFile } = require('../../../core/middleware/upload.middleware');
const { UserRole } = require('../../../shared/enums/userRole.enum');
const {
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
} = require('../dto/pharmacy.dto');

const router = Router();
const pharmacyController = container.resolve('pharmacyController');

const allRoles = [
  UserRole.PATIENT,
  UserRole.DOCTOR,
  UserRole.PHARMACY,
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
];
const pharmacyStaff = [UserRole.PHARMACY, UserRole.SUPER_ADMIN, UserRole.ADMIN];
const patientOnly = [UserRole.PATIENT];

// Medicine catalog — browse for all, manage for pharmacy staff
router.get(
  '/medicines',
  authenticate,
  authorize(...allRoles),
  listMedicinesQueryDto,
  validate,
  pharmacyController.getMedicines,
);

router.get(
  '/medicines/:id',
  authenticate,
  authorize(...allRoles),
  mongoId('id'),
  validate,
  pharmacyController.getMedicineById,
);

router.post(
  '/medicines',
  authenticate,
  authorize(...pharmacyStaff),
  createMedicineDto,
  validate,
  pharmacyController.createMedicine,
);

router.put(
  '/medicines/:id',
  authenticate,
  authorize(...pharmacyStaff),
  mongoId('id'),
  updateMedicineDto,
  validate,
  pharmacyController.updateMedicine,
);

router.delete(
  '/medicines/:id',
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  mongoId('id'),
  validate,
  pharmacyController.deleteMedicine,
);

// Inventory
router.get(
  '/inventory',
  authenticate,
  authorize(...pharmacyStaff),
  pharmacyController.getInventory,
);

router.post(
  '/inventory',
  authenticate,
  authorize(...pharmacyStaff),
  upsertInventoryDto,
  validate,
  pharmacyController.upsertInventory,
);

router.patch(
  '/inventory/:id/adjust',
  authenticate,
  authorize(...pharmacyStaff),
  mongoId('id'),
  adjustInventoryDto,
  validate,
  pharmacyController.adjustInventory,
);

// Orders — patient portal
router.get(
  '/orders/me',
  authenticate,
  authorize(...patientOnly),
  pharmacyController.getMyOrders,
);

router.post(
  '/orders',
  authenticate,
  authorize(...patientOnly),
  createOrderDto,
  validate,
  pharmacyController.createOrder,
);

router.post(
  '/orders/from-prescription/:prescriptionId',
  authenticate,
  authorize(...patientOnly),
  mongoId('prescriptionId'),
  createOrderFromPrescriptionDto,
  validate,
  pharmacyController.createOrderFromPrescription,
);

router.post(
  '/orders/:id/cancel',
  authenticate,
  authorize(UserRole.PATIENT, ...pharmacyStaff),
  mongoId('id'),
  cancelOrderDto,
  validate,
  pharmacyController.cancelOrder,
);

router.get(
  '/orders/:id',
  authenticate,
  authorize(UserRole.PATIENT, ...pharmacyStaff),
  mongoId('id'),
  validate,
  pharmacyController.getOrderById,
);

// Orders — pharmacy staff
router.get(
  '/orders',
  authenticate,
  authorize(...pharmacyStaff),
  pharmacyController.getOrders,
);

router.patch(
  '/orders/:id/status',
  authenticate,
  authorize(...pharmacyStaff),
  mongoId('id'),
  updateOrderStatusDto,
  validate,
  pharmacyController.updateOrderStatus,
);

// Prescription uploads
router.post(
  '/prescription-uploads',
  authenticate,
  authorize(...patientOnly),
  uploadPrescriptionFile,
  uploadPrescriptionDto,
  validate,
  pharmacyController.uploadPrescription,
);

router.get(
  '/prescription-uploads/me',
  authenticate,
  authorize(...patientOnly),
  pharmacyController.getMyPrescriptionUploads,
);

router.get(
  '/prescription-uploads/:id/download',
  authenticate,
  authorize(UserRole.PATIENT, ...pharmacyStaff),
  mongoId('id'),
  validate,
  pharmacyController.downloadPrescriptionUpload,
);

router.get(
  '/prescription-uploads/:id',
  authenticate,
  authorize(UserRole.PATIENT, ...pharmacyStaff),
  mongoId('id'),
  validate,
  pharmacyController.getPrescriptionUploadById,
);

router.get(
  '/prescription-uploads',
  authenticate,
  authorize(...pharmacyStaff),
  pharmacyController.getPrescriptionUploads,
);

router.patch(
  '/prescription-uploads/:id/review',
  authenticate,
  authorize(...pharmacyStaff),
  mongoId('id'),
  reviewUploadDto,
  validate,
  pharmacyController.reviewPrescriptionUpload,
);

module.exports = router;

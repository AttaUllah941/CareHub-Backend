const { Router } = require('express');
const medicinesController = require('./medicines.controller');
const medicineOrdersController = require('./medicine-orders.controller');
const {
  createPharmacySchema,
  updatePharmacyParamsSchema,
  updatePharmacySchema,
  pharmacyIdParamsSchema,
  createMedicineParamsSchema,
  createMedicineBodySchema,
  updateMedicineParamsSchema,
  updateMedicineSchema,
  deleteMedicineParamsSchema,
  updateOrderStatusParamsSchema,
  updateOrderStatusBodySchema,
} = require('./medicines.validator');
const { validate, validateRequest } = require('../../shared/middleware/validate.middleware');
const { authenticate, authorize } = require('../../core/middleware/auth.middleware');
const { UserRole } = require('../../shared/enums/userRole.enum');

const router = Router();

router.post(
  '/pharmacies',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  validate(createPharmacySchema),
  medicinesController.createPharmacy,
);

router.put(
  '/pharmacies/:id',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  validateRequest({ params: updatePharmacyParamsSchema, body: updatePharmacySchema }),
  medicinesController.updatePharmacy,
);

router.delete(
  '/pharmacies/:id',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  validate(pharmacyIdParamsSchema, 'params'),
  medicinesController.deletePharmacy,
);

router.post(
  '/pharmacies/:pharmacyId/medicines',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  validateRequest({ params: createMedicineParamsSchema, body: createMedicineBodySchema }),
  medicinesController.createMedicine,
);

router.put(
  '/pharmacies/:pharmacyId/medicines/:medicineId',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  validateRequest({ params: updateMedicineParamsSchema, body: updateMedicineSchema }),
  medicinesController.updateMedicine,
);

router.delete(
  '/pharmacies/:pharmacyId/medicines/:medicineId',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  validate(deleteMedicineParamsSchema, 'params'),
  medicinesController.deleteMedicine,
);

router.patch(
  '/orders/:id/status',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  validateRequest({ params: updateOrderStatusParamsSchema, body: updateOrderStatusBodySchema }),
  medicineOrdersController.updateStatus,
);

module.exports = router;

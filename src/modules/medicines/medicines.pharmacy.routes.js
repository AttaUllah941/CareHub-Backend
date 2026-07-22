const { Router } = require('express');
const medicineOrdersController = require('./medicine-orders.controller');
const {
  orderIdParamsSchema,
  listPharmacyOrdersQuerySchema,
  updateOrderStatusParamsSchema,
  updateOrderStatusBodySchema,
} = require('./medicines.validator');
const { validate, validateRequest } = require('../../shared/middleware/validate.middleware');
const { authenticate, authorize } = require('../../core/middleware/auth.middleware');
const { UserRole } = require('../../shared/enums/userRole.enum');
const { loadPharmacyProfile } = require('../../shared/middleware/resourceOwner.middleware');

const router = Router();

router.use(authenticate, authorize(UserRole.PHARMACY), loadPharmacyProfile);

router.get(
  '/',
  validate(listPharmacyOrdersQuerySchema, 'query'),
  medicineOrdersController.listPharmacy,
);

router.get(
  '/:id',
  validate(orderIdParamsSchema, 'params'),
  medicineOrdersController.getPharmacyById,
);

router.patch(
  '/:id/status',
  validateRequest({ params: updateOrderStatusParamsSchema, body: updateOrderStatusBodySchema }),
  medicineOrdersController.updatePharmacyStatus,
);

module.exports = router;

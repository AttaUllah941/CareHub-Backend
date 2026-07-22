const { Router } = require('express');
const medicinesController = require('./medicines.controller');
const medicineOrdersController = require('./medicine-orders.controller');
const {
  listPublicMedicinesQuerySchema,
  medicineIdParamsSchema,
  createOrderSchema,
  orderIdParamsSchema,
} = require('./medicines.validator');
const { validate } = require('../../shared/middleware/validate.middleware');
const {
  authenticate,
  optionalAuthenticate,
  authorize,
} = require('../../core/middleware/auth.middleware');
const { UserRole } = require('../../shared/enums/userRole.enum');

const router = Router();

router.get(
  '/public',
  validate(listPublicMedicinesQuerySchema, 'query'),
  medicinesController.listPublic,
);

router.get(
  '/public/:id',
  validate(medicineIdParamsSchema, 'params'),
  medicinesController.getPublicDetail,
);

router.post(
  '/orders',
  optionalAuthenticate,
  validate(createOrderSchema),
  medicineOrdersController.create,
);

router.get(
  '/orders/me',
  authenticate,
  authorize(UserRole.PATIENT),
  medicineOrdersController.listMine,
);

router.get(
  '/orders/:id',
  optionalAuthenticate,
  validate(orderIdParamsSchema, 'params'),
  medicineOrdersController.getById,
);

module.exports = router;

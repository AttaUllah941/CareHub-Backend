const { Router } = require('express');
const labsController = require('./labs.controller');
const {
  createLabSchema,
  updateLabParamsSchema,
  updateLabSchema,
  labIdParamsSchema,
  createLabTestParamsSchema,
  createLabTestBodySchema,
  updateLabTestParamsSchema,
  updateLabTestSchema,
  deleteLabTestParamsSchema,
} = require('./labs.validator');
const { validate, validateRequest } = require('../../shared/middleware/validate.middleware');
const { authenticate, authorize } = require('../../core/middleware/auth.middleware');
const { UserRole } = require('../../shared/enums/userRole.enum');

const router = Router();

router.post(
  '/',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  validate(createLabSchema),
  labsController.create,
);

router.put(
  '/:id',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  validateRequest({ params: updateLabParamsSchema, body: updateLabSchema }),
  labsController.update,
);

router.delete(
  '/:id',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  validate(labIdParamsSchema, 'params'),
  labsController.remove,
);

router.post(
  '/:labId/tests',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  validateRequest({ params: createLabTestParamsSchema, body: createLabTestBodySchema }),
  labsController.createTest,
);

router.put(
  '/:labId/tests/:testId',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  validateRequest({ params: updateLabTestParamsSchema, body: updateLabTestSchema }),
  labsController.updateTest,
);

router.delete(
  '/:labId/tests/:testId',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  validate(deleteLabTestParamsSchema, 'params'),
  labsController.removeTest,
);

module.exports = router;

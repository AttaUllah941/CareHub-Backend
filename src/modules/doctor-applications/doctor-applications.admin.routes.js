const { Router } = require('express');
const doctorApplicationsController = require('./doctor-applications.controller');
const {
  listApplicationsQuerySchema,
  applicationIdParamsSchema,
  rejectApplicationParamsSchema,
  rejectApplicationBodySchema,
} = require('./doctor-applications.validator');
const { validate, validateRequest } = require('../../shared/middleware/validate.middleware');
const { authenticate, authorize } = require('../../core/middleware/auth.middleware');
const { UserRole } = require('../../shared/enums/userRole.enum');

const router = Router();

router.get(
  '/',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  validate(listApplicationsQuerySchema, 'query'),
  doctorApplicationsController.list,
);

router.get(
  '/:id',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  validate(applicationIdParamsSchema, 'params'),
  doctorApplicationsController.getById,
);

router.patch(
  '/:id/approve',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  validate(applicationIdParamsSchema, 'params'),
  doctorApplicationsController.approve,
);

router.patch(
  '/:id/reject',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  validateRequest({
    params: rejectApplicationParamsSchema,
    body: rejectApplicationBodySchema,
  }),
  doctorApplicationsController.reject,
);

module.exports = router;

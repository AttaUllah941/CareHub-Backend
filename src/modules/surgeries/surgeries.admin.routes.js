const { Router } = require('express');
const surgeriesController = require('./surgeries.controller');
const consultationRequestsController = require('./surgery-consultation-requests.controller');
const {
  createProcedureSchema,
  updateProcedureParamsSchema,
  updateProcedureSchema,
  procedureIdParamsSchema,
  updateConsultationRequestStatusParamsSchema,
  updateConsultationRequestStatusBodySchema,
  listConsultationRequestsQuerySchema,
} = require('./surgeries.validator');
const { validate, validateRequest } = require('../../shared/middleware/validate.middleware');
const { authenticate, authorize } = require('../../core/middleware/auth.middleware');
const { UserRole } = require('../../shared/enums/userRole.enum');

const router = Router();

router.post(
  '/procedures',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  validate(createProcedureSchema),
  surgeriesController.createProcedure,
);

router.put(
  '/procedures/:id',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  validateRequest({ params: updateProcedureParamsSchema, body: updateProcedureSchema }),
  surgeriesController.updateProcedure,
);

router.delete(
  '/procedures/:id',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  validate(procedureIdParamsSchema, 'params'),
  surgeriesController.deleteProcedure,
);

router.get(
  '/consultation-requests',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  validate(listConsultationRequestsQuerySchema, 'query'),
  consultationRequestsController.listAdmin,
);

router.patch(
  '/consultation-requests/:id',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  validateRequest({
    params: updateConsultationRequestStatusParamsSchema,
    body: updateConsultationRequestStatusBodySchema,
  }),
  consultationRequestsController.updateStatus,
);

module.exports = router;

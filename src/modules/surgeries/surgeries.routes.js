const { Router } = require('express');
const surgeriesController = require('./surgeries.controller');
const consultationRequestsController = require('./surgery-consultation-requests.controller');
const {
  listPublicProceduresQuerySchema,
  publicProcedureSlugParamsSchema,
  createConsultationRequestSchema,
  listConsultationRequestsQuerySchema,
} = require('./surgeries.validator');
const { validate } = require('../../shared/middleware/validate.middleware');
const {
  authenticate,
  optionalAuthenticate,
  authorize,
} = require('../../core/middleware/auth.middleware');
const { UserRole } = require('../../shared/enums/userRole.enum');

const router = Router();

router.get(
  '/public/procedures',
  validate(listPublicProceduresQuerySchema, 'query'),
  surgeriesController.listPublicProcedures,
);

router.get(
  '/public/procedures/:slug',
  validate(publicProcedureSlugParamsSchema, 'params'),
  surgeriesController.getPublicProcedureDetail,
);

router.post(
  '/consultation-requests',
  optionalAuthenticate,
  validate(createConsultationRequestSchema),
  consultationRequestsController.create,
);

router.get(
  '/consultation-requests/me',
  authenticate,
  authorize(UserRole.PATIENT),
  validate(listConsultationRequestsQuerySchema, 'query'),
  consultationRequestsController.listMine,
);

module.exports = router;

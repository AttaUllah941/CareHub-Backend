const express = require('express');
const prescriptionsController = require('./prescriptions.controller');
const { listPrescriptionsQuerySchema } = require('./prescriptions.validator');
const { validate } = require('../../shared/middleware/validate.middleware');
const { authenticate, authorize } = require('../../core/middleware/auth.middleware');
const { UserRole } = require('../../shared/enums/userRole.enum');

const router = express.Router();

router.get(
  '/me',
  authenticate,
  authorize(UserRole.PATIENT),
  validate(listPrescriptionsQuerySchema, 'query'),
  prescriptionsController.listPatientMine,
);

module.exports = router;

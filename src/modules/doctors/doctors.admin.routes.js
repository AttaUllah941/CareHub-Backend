const express = require('express');
const doctorsController = require('./doctors.controller');
const { verificationSchema } = require('./doctors.validator');
const { validateBody } = require('../../shared/middleware/validate.middleware');
const { authenticate } = require('../../shared/middleware/auth.middleware');
const { authorize } = require('../../shared/middleware/role.middleware');

const router = express.Router();

router.get('/', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), doctorsController.listAdmin);

router.patch(
  '/:id/verification',
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN'),
  validateBody(verificationSchema),
  doctorsController.updateVerification,
);

module.exports = router;

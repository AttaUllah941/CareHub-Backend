const { Router } = require('express');
const doctorsController = require('./doctors.controller');
const { verificationSchema } = require('./doctors.validator');
const { validate, validateRequest } = require('../../shared/middleware/validate.middleware');
const { authenticate, authorize } = require('../../core/middleware/auth.middleware');
const { UserRole } = require('../../shared/enums/userRole.enum');
const { objectIdSchema } = require('../../shared/utils/zodSchemas');
const { z } = require('zod');

const router = Router();

router.use(authenticate, authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN));

router.get('/', doctorsController.listAdmin);

router.patch(
  '/:id/verification',
  validateRequest({
    params: z.object({ id: objectIdSchema('id') }),
    body: verificationSchema,
  }),
  doctorsController.updateVerification,
);

module.exports = router;

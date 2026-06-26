const { Router } = require('express');
const hospitalsController = require('./hospitals.controller');
const {
  createHospitalSchema,
  updateHospitalParamsSchema,
  updateHospitalSchema,
  hospitalIdParamsSchema,
  linkDoctorParamsSchema,
  linkDoctorBodySchema,
  unlinkDoctorParamsSchema,
} = require('./hospitals.validator');
const { validate, validateRequest } = require('../../shared/middleware/validate.middleware');
const { authenticate, authorize } = require('../../core/middleware/auth.middleware');
const { UserRole } = require('../../shared/enums/userRole.enum');

const router = Router();

router.post(
  '/',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  validate(createHospitalSchema),
  hospitalsController.create,
);

router.put(
  '/:id',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  validateRequest({ params: updateHospitalParamsSchema, body: updateHospitalSchema }),
  hospitalsController.update,
);

router.delete(
  '/:id',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  validate(hospitalIdParamsSchema, 'params'),
  hospitalsController.remove,
);

router.post(
  '/:id/doctors',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  validateRequest({ params: linkDoctorParamsSchema, body: linkDoctorBodySchema }),
  hospitalsController.linkDoctor,
);

router.delete(
  '/:id/doctors/:doctorId',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  validate(unlinkDoctorParamsSchema, 'params'),
  hospitalsController.unlinkDoctor,
);

module.exports = router;

const { Router } = require('express');
const container = require('../../../core/container');
const validate = require('../../../core/middleware/validate.middleware');
const { authenticate, authorize } = require('../../../core/middleware/auth.middleware');
const { UserRole } = require('../../../shared/enums/userRole.enum');
const {
  prescriptionIdParam,
  consultationIdParam,
  createPrescriptionDto,
  updatePrescriptionDto,
  listPrescriptionsQueryDto,
} = require('../dto/prescription.dto');

const router = Router();
const prescriptionController = container.resolve('prescriptionController');

router.get(
  '/me',
  authenticate,
  authorize(UserRole.PATIENT),
  prescriptionController.getMyPrescriptions,
);

router.get(
  '/doctor',
  authenticate,
  authorize(UserRole.DOCTOR),
  prescriptionController.getDoctorPrescriptions,
);

router.get(
  '/consultation/:consultationId',
  authenticate,
  authorize(UserRole.PATIENT, UserRole.DOCTOR, UserRole.SUPER_ADMIN, UserRole.ADMIN),
  consultationIdParam,
  validate,
  prescriptionController.getByConsultationId,
);

router.post(
  '/consultation/:consultationId',
  authenticate,
  authorize(UserRole.DOCTOR),
  createPrescriptionDto,
  validate,
  prescriptionController.createForConsultation,
);

router.get(
  '/:id/pdf',
  authenticate,
  authorize(UserRole.PATIENT, UserRole.DOCTOR, UserRole.SUPER_ADMIN, UserRole.ADMIN),
  prescriptionIdParam,
  validate,
  prescriptionController.downloadPdf,
);

router.get(
  '/:id',
  authenticate,
  authorize(UserRole.PATIENT, UserRole.DOCTOR, UserRole.SUPER_ADMIN, UserRole.ADMIN),
  prescriptionIdParam,
  validate,
  prescriptionController.getPrescriptionById,
);

router.put(
  '/:id',
  authenticate,
  authorize(UserRole.DOCTOR, UserRole.SUPER_ADMIN, UserRole.ADMIN),
  prescriptionIdParam,
  updatePrescriptionDto,
  validate,
  prescriptionController.updatePrescription,
);

router.use(authenticate, authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN));

router.get('/', listPrescriptionsQueryDto, validate, prescriptionController.getPrescriptions);
router.delete('/:id', prescriptionIdParam, validate, prescriptionController.deletePrescription);

module.exports = router;

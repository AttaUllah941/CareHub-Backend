const { Router } = require('express');
const container = require('../../../core/container');
const validate = require('../../../core/middleware/validate.middleware');
const { authenticate, authorize } = require('../../../core/middleware/auth.middleware');
const { UserRole } = require('../../../shared/enums/userRole.enum');
const {
  consultationIdParam,
  appointmentIdParam,
  createConsultationDto,
  updateConsultationDto,
  listConsultationsQueryDto,
} = require('../dto/consultation.dto');

const router = Router();
const consultationController = container.resolve('consultationController');

router.get(
  '/me',
  authenticate,
  authorize(UserRole.PATIENT),
  consultationController.getMyConsultations,
);

router.get(
  '/doctor',
  authenticate,
  authorize(UserRole.DOCTOR),
  consultationController.getDoctorConsultations,
);

router.get(
  '/appointment/:appointmentId',
  authenticate,
  authorize(UserRole.PATIENT, UserRole.DOCTOR, UserRole.SUPER_ADMIN, UserRole.ADMIN),
  appointmentIdParam,
  validate,
  consultationController.getByAppointmentId,
);

router.post(
  '/appointment/:appointmentId',
  authenticate,
  authorize(UserRole.DOCTOR),
  createConsultationDto,
  validate,
  consultationController.createForAppointment,
);

router.get(
  '/:id',
  authenticate,
  authorize(UserRole.PATIENT, UserRole.DOCTOR, UserRole.SUPER_ADMIN, UserRole.ADMIN),
  consultationIdParam,
  validate,
  consultationController.getConsultationById,
);

router.put(
  '/:id',
  authenticate,
  authorize(UserRole.DOCTOR, UserRole.SUPER_ADMIN, UserRole.ADMIN),
  consultationIdParam,
  updateConsultationDto,
  validate,
  consultationController.updateConsultation,
);

router.use(authenticate, authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN));

router.get('/', listConsultationsQueryDto, validate, consultationController.getConsultations);
router.delete('/:id', consultationIdParam, validate, consultationController.deleteConsultation);

module.exports = router;

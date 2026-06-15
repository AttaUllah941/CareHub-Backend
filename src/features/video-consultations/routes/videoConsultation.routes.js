const { Router } = require('express');
const container = require('../../../core/container');
const validate = require('../../../core/middleware/validate.middleware');
const { authenticate, authorize } = require('../../../core/middleware/auth.middleware');
const { UserRole } = require('../../../shared/enums/userRole.enum');
const { sessionIdParam, appointmentIdParam, stopRecordingDto } = require('../dto/videoConsultation.dto');

const router = Router();
const videoConsultationController = container.resolve('videoConsultationController');

const portalRoles = [UserRole.PATIENT, UserRole.DOCTOR, UserRole.SUPER_ADMIN, UserRole.ADMIN];

router.use(authenticate, authorize(...portalRoles));

router.post(
  '/appointment/:appointmentId/session',
  appointmentIdParam,
  validate,
  videoConsultationController.createOrJoin,
);

router.get(
  '/appointment/:appointmentId/session',
  appointmentIdParam,
  validate,
  videoConsultationController.getByAppointment,
);

router.get('/session/:id', sessionIdParam, validate, videoConsultationController.getSession);
router.post('/session/:id/join', sessionIdParam, validate, videoConsultationController.joinSession);
router.post('/session/:id/end', sessionIdParam, validate, videoConsultationController.endSession);
router.get('/session/:id/messages', sessionIdParam, validate, videoConsultationController.getMessages);

router.post(
  '/session/:id/recording/start',
  authorize(UserRole.DOCTOR, UserRole.SUPER_ADMIN, UserRole.ADMIN),
  sessionIdParam,
  validate,
  videoConsultationController.startRecording,
);

router.post(
  '/session/:id/recording/stop',
  authorize(UserRole.DOCTOR, UserRole.SUPER_ADMIN, UserRole.ADMIN),
  sessionIdParam,
  stopRecordingDto,
  validate,
  videoConsultationController.stopRecording,
);

module.exports = router;

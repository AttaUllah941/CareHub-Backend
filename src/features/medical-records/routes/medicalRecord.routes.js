const { Router } = require('express');
const container = require('../../../core/container');
const validate = require('../../../core/middleware/validate.middleware');
const { uploadMedicalRecord } = require('../../../core/middleware/upload.middleware');
const { authenticate, authorize } = require('../../../core/middleware/auth.middleware');
const { UserRole } = require('../../../shared/enums/userRole.enum');
const {
  recordIdParam,
  patientProfileIdParam,
  consultationIdParam,
  uploadRecordDto,
  uploadVersionDto,
  updateRecordDto,
  listRecordsQueryDto,
  myRecordsQueryDto,
  downloadQueryDto,
} = require('../dto/medicalRecord.dto');

const router = Router();
const medicalRecordController = container.resolve('medicalRecordController');

router.post(
  '/upload',
  authenticate,
  authorize(UserRole.PATIENT, UserRole.DOCTOR, UserRole.SUPER_ADMIN, UserRole.ADMIN),
  uploadMedicalRecord,
  uploadRecordDto,
  validate,
  medicalRecordController.uploadRecord,
);

router.get(
  '/me',
  authenticate,
  authorize(UserRole.PATIENT),
  myRecordsQueryDto,
  validate,
  medicalRecordController.getMyRecords,
);

router.get(
  '/patient/:patientProfileId',
  authenticate,
  authorize(UserRole.DOCTOR, UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.PATIENT),
  patientProfileIdParam,
  myRecordsQueryDto,
  validate,
  medicalRecordController.getByPatientId,
);

router.get(
  '/consultation/:consultationId',
  authenticate,
  authorize(UserRole.PATIENT, UserRole.DOCTOR, UserRole.SUPER_ADMIN, UserRole.ADMIN),
  consultationIdParam,
  validate,
  medicalRecordController.getByConsultationId,
);

router.get(
  '/:id/download',
  authenticate,
  authorize(UserRole.PATIENT, UserRole.DOCTOR, UserRole.SUPER_ADMIN, UserRole.ADMIN),
  recordIdParam,
  downloadQueryDto,
  validate,
  medicalRecordController.downloadRecord,
);

router.get(
  '/:id/history',
  authenticate,
  authorize(UserRole.PATIENT, UserRole.DOCTOR, UserRole.SUPER_ADMIN, UserRole.ADMIN),
  recordIdParam,
  validate,
  medicalRecordController.getRecordHistory,
);

router.post(
  '/:id/upload',
  authenticate,
  authorize(UserRole.PATIENT, UserRole.DOCTOR, UserRole.SUPER_ADMIN, UserRole.ADMIN),
  recordIdParam,
  uploadMedicalRecord,
  uploadVersionDto,
  validate,
  medicalRecordController.uploadNewVersion,
);

router.get(
  '/:id',
  authenticate,
  authorize(UserRole.PATIENT, UserRole.DOCTOR, UserRole.SUPER_ADMIN, UserRole.ADMIN),
  recordIdParam,
  validate,
  medicalRecordController.getRecordById,
);

router.put(
  '/:id',
  authenticate,
  authorize(UserRole.PATIENT, UserRole.DOCTOR, UserRole.SUPER_ADMIN, UserRole.ADMIN),
  recordIdParam,
  updateRecordDto,
  validate,
  medicalRecordController.updateRecord,
);

router.use(authenticate, authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN));

router.get('/', listRecordsQueryDto, validate, medicalRecordController.getRecords);
router.delete('/:id', recordIdParam, validate, medicalRecordController.deleteRecord);

module.exports = router;

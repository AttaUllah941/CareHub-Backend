const { Router } = require('express');
const container = require('../../../core/container');
const validate = require('../../../core/middleware/validate.middleware');
const { authenticate, authorize } = require('../../../core/middleware/auth.middleware');
const { UserRole } = require('../../../shared/enums/userRole.enum');
const {
  patientIdParam,
  listPatientsQueryDto,
  createPatientDto,
  updatePatientDto,
  createMyProfileDto,
  updateMyProfileDto,
} = require('../dto/patient.dto');

const router = Router();
const patientController = container.resolve('patientController');

router.get('/me', authenticate, authorize(UserRole.PATIENT), patientController.getMyProfile);
router.post(
  '/me',
  authenticate,
  authorize(UserRole.PATIENT),
  createMyProfileDto,
  validate,
  patientController.createMyProfile,
);
router.put(
  '/me',
  authenticate,
  authorize(UserRole.PATIENT),
  updateMyProfileDto,
  validate,
  patientController.updateMyProfile,
);

router.get(
  '/:id',
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.DOCTOR, UserRole.PATIENT),
  patientIdParam,
  validate,
  patientController.getPatientById,
);

router.use(authenticate, authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN));

router.get('/', listPatientsQueryDto, validate, patientController.getPatients);
router.post('/', createPatientDto, validate, patientController.createPatient);
router.put('/:id', updatePatientDto, validate, patientController.updatePatient);
router.delete('/:id', patientIdParam, validate, patientController.deletePatient);

module.exports = router;

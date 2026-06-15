const { Router } = require('express');
const container = require('../../../core/container');
const validate = require('../../../core/middleware/validate.middleware');
const { authenticate, authorize } = require('../../../core/middleware/auth.middleware');
const { UserRole } = require('../../../shared/enums/userRole.enum');
const {
  doctorIdParam,
  listDoctorsQueryDto,
  searchDoctorsQueryDto,
  createDoctorDto,
  updateDoctorDto,
  updateMyProfileDto,
  createMyProfileDto,
  verifyDoctorDto,
} = require('../dto/doctor.dto');

const router = Router();
const doctorController = container.resolve('doctorController');

router.get(
  '/me',
  authenticate,
  authorize(UserRole.DOCTOR),
  doctorController.getMyProfile,
);

router.post(
  '/me',
  authenticate,
  authorize(UserRole.DOCTOR),
  createMyProfileDto,
  validate,
  doctorController.createMyProfile,
);

router.put(
  '/me',
  authenticate,
  authorize(UserRole.DOCTOR),
  updateMyProfileDto,
  validate,
  doctorController.updateMyProfile,
);

router.get(
  '/search',
  authenticate,
  authorize(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.DOCTOR,
    UserRole.PATIENT,
    UserRole.CLINIC_MANAGER,
  ),
  searchDoctorsQueryDto,
  validate,
  doctorController.searchDoctors,
);

router.use(authenticate, authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN));

router.get('/', listDoctorsQueryDto, validate, doctorController.getDoctors);
router.get('/:id', doctorIdParam, validate, doctorController.getDoctorById);
router.post('/', createDoctorDto, validate, doctorController.createDoctor);
router.put('/:id', updateDoctorDto, validate, doctorController.updateDoctor);
router.patch('/:id/verify', verifyDoctorDto, validate, doctorController.verifyDoctor);
router.delete('/:id', doctorIdParam, validate, doctorController.deleteDoctor);

module.exports = router;

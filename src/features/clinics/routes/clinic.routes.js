const { Router } = require('express');
const container = require('../../../core/container');
const validate = require('../../../core/middleware/validate.middleware');
const { authenticate, authorize } = require('../../../core/middleware/auth.middleware');
const { UserRole } = require('../../../shared/enums/userRole.enum');
const {
  clinicIdParam,
  listClinicsQueryDto,
  createClinicDto,
  updateClinicDto,
  updateMyClinicDto,
  assignDoctorsDto,
} = require('../dto/clinic.dto');

const router = Router();
const clinicController = container.resolve('clinicController');

router.get(
  '/all',
  authenticate,
  authorize(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.CLINIC_MANAGER,
    UserRole.DOCTOR,
    UserRole.PATIENT,
  ),
  clinicController.getAllActive,
);

router.get('/me', authenticate, authorize(UserRole.CLINIC_MANAGER), clinicController.getMyClinic);
router.put(
  '/me',
  authenticate,
  authorize(UserRole.CLINIC_MANAGER),
  updateMyClinicDto,
  validate,
  clinicController.updateMyClinic,
);
router.put(
  '/me/doctors',
  authenticate,
  authorize(UserRole.CLINIC_MANAGER),
  assignDoctorsDto,
  validate,
  clinicController.assignMyDoctors,
);

router.use(authenticate, authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN));

router.get('/', listClinicsQueryDto, validate, clinicController.getClinics);
router.get('/:id', clinicIdParam, validate, clinicController.getClinicById);
router.post('/', createClinicDto, validate, clinicController.createClinic);
router.put('/:id', updateClinicDto, validate, clinicController.updateClinic);
router.put('/:id/doctors', clinicIdParam, assignDoctorsDto, validate, clinicController.assignDoctors);
router.delete('/:id', clinicIdParam, validate, clinicController.deleteClinic);

module.exports = router;

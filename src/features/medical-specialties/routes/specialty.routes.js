const { Router } = require('express');
const container = require('../../../core/container');
const validate = require('../../../core/middleware/validate.middleware');
const { authenticate, authorize } = require('../../../core/middleware/auth.middleware');
const { UserRole } = require('../../../shared/enums/userRole.enum');
const {
  specialtyIdParam,
  listSpecialtiesQueryDto,
  createSpecialtyDto,
  updateSpecialtyDto,
} = require('../dto/specialty.dto');

const router = Router();
const specialtyController = container.resolve('specialtyController');

router.get('/public', specialtyController.getPublicSpecialties);

router.get(
  '/all',
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.DOCTOR, UserRole.PATIENT),
  specialtyController.getAllActive,
);

router.use(authenticate, authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN));

router.get('/', listSpecialtiesQueryDto, validate, specialtyController.getSpecialties);
router.get('/:id', specialtyIdParam, validate, specialtyController.getSpecialtyById);
router.post('/', createSpecialtyDto, validate, specialtyController.createSpecialty);
router.put('/:id', updateSpecialtyDto, validate, specialtyController.updateSpecialty);
router.delete('/:id', specialtyIdParam, validate, specialtyController.deleteSpecialty);

module.exports = router;

const { Router } = require('express');
const container = require('../../../core/container');
const validate = require('../../../core/middleware/validate.middleware');
const { authenticate, authorize } = require('../../../core/middleware/auth.middleware');
const { UserRole } = require('../../../shared/enums/userRole.enum');
const {
  familyMemberIdParam,
  patientProfileIdParam,
  listFamilyMembersQueryDto,
  createFamilyMemberDto,
  updateFamilyMemberDto,
  createMyFamilyMemberDto,
  updateMyFamilyMemberDto,
} = require('../dto/familyMember.dto');

const router = Router();
const familyMemberController = container.resolve('familyMemberController');

router.get('/me', authenticate, authorize(UserRole.PATIENT), familyMemberController.getMyFamilyMembers);
router.post(
  '/me',
  authenticate,
  authorize(UserRole.PATIENT),
  createMyFamilyMemberDto,
  validate,
  familyMemberController.createMyFamilyMember,
);
router.put(
  '/me/:id',
  authenticate,
  authorize(UserRole.PATIENT),
  updateMyFamilyMemberDto,
  validate,
  familyMemberController.updateMyFamilyMember,
);
router.delete(
  '/me/:id',
  authenticate,
  authorize(UserRole.PATIENT),
  familyMemberIdParam,
  validate,
  familyMemberController.deleteMyFamilyMember,
);

router.get(
  '/patient/:patientProfileId',
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.DOCTOR, UserRole.PATIENT),
  patientProfileIdParam,
  validate,
  familyMemberController.getByPatientId,
);

router.get(
  '/:id',
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.DOCTOR, UserRole.PATIENT),
  familyMemberIdParam,
  validate,
  familyMemberController.getFamilyMemberById,
);

router.use(authenticate, authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN));

router.get('/', listFamilyMembersQueryDto, validate, familyMemberController.getFamilyMembers);
router.post('/', createFamilyMemberDto, validate, familyMemberController.createFamilyMember);
router.put('/:id', updateFamilyMemberDto, validate, familyMemberController.updateFamilyMember);
router.delete('/:id', familyMemberIdParam, validate, familyMemberController.deleteFamilyMember);

module.exports = router;

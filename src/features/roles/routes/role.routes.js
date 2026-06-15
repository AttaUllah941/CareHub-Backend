const { Router } = require('express');
const container = require('../../../core/container');
const validate = require('../../../core/middleware/validate.middleware');
const { authenticate, authorize } = require('../../../core/middleware/auth.middleware');
const { UserRole } = require('../../../shared/enums/userRole.enum');
const {
  permissionIdParam,
  roleIdParam,
  listPermissionsQueryDto,
  createPermissionDto,
  updatePermissionDto,
  listRolesQueryDto,
  createRoleDto,
  updateRoleDto,
  assignPermissionsDto,
  assignRoleToUserDto,
} = require('../dto/role.dto');

const router = Router();
const permissionController = container.resolve('permissionController');
const roleController = container.resolve('roleController');

router.use(authenticate, authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN));

// ─── Permissions ───────────────────────────────────────────
router.get('/permissions/all', permissionController.getAllActive);
router.get('/permissions', listPermissionsQueryDto, validate, permissionController.getPermissions);
router.get('/permissions/:id', permissionIdParam, validate, permissionController.getPermissionById);
router.post('/permissions', createPermissionDto, validate, permissionController.createPermission);
router.put('/permissions/:id', updatePermissionDto, validate, permissionController.updatePermission);
router.delete('/permissions/:id', permissionIdParam, validate, permissionController.deletePermission);

// ─── Roles ─────────────────────────────────────────────────
router.get('/roles', listRolesQueryDto, validate, roleController.getRoles);
router.get('/roles/:id', roleIdParam, validate, roleController.getRoleById);
router.post('/roles', createRoleDto, validate, roleController.createRole);
router.put('/roles/:id', updateRoleDto, validate, roleController.updateRole);
router.delete('/roles/:id', roleIdParam, validate, roleController.deleteRole);
router.put('/roles/:id/permissions', assignPermissionsDto, validate, roleController.assignPermissions);
router.post('/roles/:id/assign', assignRoleToUserDto, validate, roleController.assignRoleToUser);

module.exports = router;

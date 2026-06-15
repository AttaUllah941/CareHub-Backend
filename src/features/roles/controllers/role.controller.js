const asyncHandler = require('../../../core/utils/asyncHandler');
const { HttpStatus } = require('../../../shared/constants/httpStatus.constants');

class RoleController {
  constructor(roleService) {
    this.roleService = roleService;
  }

  getRoles = asyncHandler(async (req, res) => {
    const result = await this.roleService.getRoles(req.query, req.user);
    res.status(HttpStatus.OK).json({ success: true, data: result });
  });

  getRoleById = asyncHandler(async (req, res) => {
    const role = await this.roleService.getRoleById(req.params.id, req.user);
    res.status(HttpStatus.OK).json({ success: true, data: { role } });
  });

  createRole = asyncHandler(async (req, res) => {
    const role = await this.roleService.createRole(req.body, req.user);
    res.status(HttpStatus.CREATED).json({
      success: true,
      message: 'Role created successfully',
      data: { role },
    });
  });

  updateRole = asyncHandler(async (req, res) => {
    const role = await this.roleService.updateRole(req.params.id, req.body, req.user);
    res.status(HttpStatus.OK).json({
      success: true,
      message: 'Role updated successfully',
      data: { role },
    });
  });

  deleteRole = asyncHandler(async (req, res) => {
    const result = await this.roleService.deleteRole(req.params.id, req.user);
    res.status(HttpStatus.OK).json({ success: true, message: result.message });
  });

  assignPermissions = asyncHandler(async (req, res) => {
    const role = await this.roleService.assignPermissions(
      req.params.id,
      req.body.permissionIds,
      req.user,
    );
    res.status(HttpStatus.OK).json({
      success: true,
      message: 'Permissions assigned successfully',
      data: { role },
    });
  });

  assignRoleToUser = asyncHandler(async (req, res) => {
    const result = await this.roleService.assignRoleToUser(
      req.params.id,
      req.body.userId,
      req.user,
    );
    res.status(HttpStatus.OK).json({
      success: true,
      message: 'Role assigned to user successfully',
      data: result,
    });
  });
}

module.exports = RoleController;

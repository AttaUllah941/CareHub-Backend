const asyncHandler = require('../../../core/utils/asyncHandler');
const { HttpStatus } = require('../../../shared/constants/httpStatus.constants');

class PermissionController {
  constructor(permissionService) {
    this.permissionService = permissionService;
  }

  getPermissions = asyncHandler(async (req, res) => {
    const result = await this.permissionService.getPermissions(req.query, req.user);
    res.status(HttpStatus.OK).json({ success: true, data: result });
  });

  getAllActive = asyncHandler(async (req, res) => {
    const permissions = await this.permissionService.getAllActivePermissions(req.user);
    res.status(HttpStatus.OK).json({ success: true, data: { permissions } });
  });

  getPermissionById = asyncHandler(async (req, res) => {
    const permission = await this.permissionService.getPermissionById(req.params.id, req.user);
    res.status(HttpStatus.OK).json({ success: true, data: { permission } });
  });

  createPermission = asyncHandler(async (req, res) => {
    const permission = await this.permissionService.createPermission(req.body, req.user);
    res.status(HttpStatus.CREATED).json({
      success: true,
      message: 'Permission created successfully',
      data: { permission },
    });
  });

  updatePermission = asyncHandler(async (req, res) => {
    const permission = await this.permissionService.updatePermission(req.params.id, req.body, req.user);
    res.status(HttpStatus.OK).json({
      success: true,
      message: 'Permission updated successfully',
      data: { permission },
    });
  });

  deletePermission = asyncHandler(async (req, res) => {
    const result = await this.permissionService.deletePermission(req.params.id, req.user);
    res.status(HttpStatus.OK).json({ success: true, message: result.message });
  });
}

module.exports = PermissionController;

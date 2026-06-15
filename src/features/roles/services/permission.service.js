const {
  ConflictError,
  NotFoundError,
  ForbiddenError,
  BadRequestError,
} = require('../../../core/errors/AppError');
const { UserRole } = require('../../../shared/enums/userRole.enum');
const {
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
} = require('../../../shared/constants/pagination.constants');

class PermissionService {
  constructor(permissionRepository) {
    this.permissionRepository = permissionRepository;
  }

  _assertSuperAdmin(requestedBy) {
    if (!requestedBy || requestedBy.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenError('Only SUPER_ADMIN can manage permissions');
    }
  }

  async getPermissions(query, requestedBy) {
    this._assertCanRead(requestedBy);
    const result = await this.permissionRepository.findAll({
      page: parseInt(query.page, 10) || DEFAULT_PAGE,
      limit: parseInt(query.limit, 10) || DEFAULT_LIMIT,
      search: query.search,
      module: query.module,
      isActive: query.isActive !== undefined ? query.isActive === 'true' : undefined,
      sortBy: query.sortBy || 'module',
      sortOrder: query.sortOrder || 'asc',
    });
    return {
      permissions: result.permissions.map((p) => p.toJSON()),
      pagination: result.pagination,
    };
  }

  async getAllActivePermissions(requestedBy) {
    this._assertCanRead(requestedBy);
    const permissions = await this.permissionRepository.findAllActive();
    return permissions.map((p) => p.toJSON());
  }

  async getPermissionById(id, requestedBy) {
    this._assertCanRead(requestedBy);
    const permission = await this.permissionRepository.findById(id);
    if (!permission) throw new NotFoundError('Permission not found');
    return permission.toJSON();
  }

  async createPermission(data, requestedBy) {
    this._assertSuperAdmin(requestedBy);
    const existing = await this.permissionRepository.findBySlug(data.slug);
    if (existing) throw new ConflictError('Permission slug already exists');
    const permission = await this.permissionRepository.create({
      ...data,
      slug: data.slug.toLowerCase(),
    });
    return permission.toJSON();
  }

  async updatePermission(id, data, requestedBy) {
    this._assertSuperAdmin(requestedBy);
    const permission = await this.permissionRepository.findById(id);
    if (!permission) throw new NotFoundError('Permission not found');

    if (data.slug && data.slug !== permission.slug) {
      const existing = await this.permissionRepository.findBySlug(data.slug);
      if (existing) throw new ConflictError('Permission slug already exists');
      data.slug = data.slug.toLowerCase();
    }

    const updated = await this.permissionRepository.updateById(id, data);
    return updated.toJSON();
  }

  async deletePermission(id, requestedBy) {
    this._assertSuperAdmin(requestedBy);
    const permission = await this.permissionRepository.findById(id);
    if (!permission) throw new NotFoundError('Permission not found');
    await this.permissionRepository.softDeleteById(id);
    return { message: 'Permission deactivated successfully' };
  }

  _assertCanRead(requestedBy) {
    if (!requestedBy || ![UserRole.SUPER_ADMIN, UserRole.ADMIN].includes(requestedBy.role)) {
      throw new ForbiddenError('Insufficient permissions');
    }
  }
}

module.exports = PermissionService;

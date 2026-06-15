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

class RoleService {
  constructor(roleRepository, permissionRepository, userRepository) {
    this.roleRepository = roleRepository;
    this.permissionRepository = permissionRepository;
    this.userRepository = userRepository;
  }

  async getRoles(query, requestedBy) {
    this._assertCanRead(requestedBy);
    const result = await this.roleRepository.findAll({
      page: parseInt(query.page, 10) || DEFAULT_PAGE,
      limit: parseInt(query.limit, 10) || DEFAULT_LIMIT,
      search: query.search,
      isActive: query.isActive !== undefined ? query.isActive === 'true' : undefined,
      isSystem: query.isSystem !== undefined ? query.isSystem === 'true' : undefined,
      sortBy: query.sortBy || 'createdAt',
      sortOrder: query.sortOrder || 'desc',
    });
    return {
      roles: result.roles.map((r) => this._formatRole(r)),
      pagination: result.pagination,
    };
  }

  async getRoleById(id, requestedBy) {
    this._assertCanRead(requestedBy);
    const role = await this.roleRepository.findById(id);
    if (!role) throw new NotFoundError('Role not found');
    return this._formatRole(role);
  }

  async createRole(data, requestedBy) {
    this._assertSuperAdmin(requestedBy);
    const slug = data.slug.toUpperCase();
    const existing = await this.roleRepository.findBySlug(slug);
    if (existing) throw new ConflictError('Role slug already exists');

    let permissionIds = [];
    if (data.permissionIds?.length) {
      const permissions = await this.permissionRepository.findByIds(data.permissionIds);
      permissionIds = permissions.map((p) => p._id);
    }

    const role = await this.roleRepository.create({
      name: data.name,
      slug,
      description: data.description,
      permissions: permissionIds,
      isSystem: false,
    });

    const populated = await this.roleRepository.findById(role._id);
    return this._formatRole(populated);
  }

  async updateRole(id, data, requestedBy) {
    this._assertSuperAdmin(requestedBy);
    const role = await this.roleRepository.findById(id);
    if (!role) throw new NotFoundError('Role not found');
    if (role.isSystem && data.isActive === false) {
      throw new BadRequestError('System roles cannot be deactivated');
    }

    const updated = await this.roleRepository.updateById(id, data);
    return this._formatRole(updated);
  }

  async deleteRole(id, requestedBy) {
    this._assertSuperAdmin(requestedBy);
    const role = await this.roleRepository.findById(id);
    if (!role) throw new NotFoundError('Role not found');
    if (role.isSystem) throw new BadRequestError('System roles cannot be deleted');

    await this.roleRepository.softDeleteById(id);
    return { message: 'Role deactivated successfully' };
  }

  async assignPermissions(roleId, permissionIds, requestedBy) {
    this._assertSuperAdmin(requestedBy);
    const role = await this.roleRepository.findById(roleId);
    if (!role) throw new NotFoundError('Role not found');
    if (role.isSystem && role.slug === UserRole.SUPER_ADMIN) {
      throw new BadRequestError('SUPER_ADMIN permissions cannot be modified');
    }

    const permissions = await this.permissionRepository.findByIds(permissionIds);
    if (permissions.length !== permissionIds.length) {
      throw new BadRequestError('One or more permission IDs are invalid');
    }

    const updated = await this.roleRepository.assignPermissions(
      roleId,
      permissions.map((p) => p._id),
    );
    return this._formatRole(updated);
  }

  async assignRoleToUser(roleId, userId, requestedBy) {
    this._assertCanAssign(requestedBy);
    const role = await this.roleRepository.findById(roleId);
    if (!role || !role.isActive) throw new NotFoundError('Role not found or inactive');

    if ([UserRole.SUPER_ADMIN, UserRole.ADMIN].includes(role.slug) && requestedBy.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenError('Only SUPER_ADMIN can assign admin roles');
    }

    const user = await this.userRepository.findById(userId);
    if (!user) throw new NotFoundError('User not found');

    if (requestedBy.id === userId && role.slug !== user.role) {
      throw new BadRequestError('You cannot change your own role');
    }

    const updated = await this.userRepository.assignRole(userId, role._id, role.slug);
    return { user: updated.toJSON(), role: this._formatRole(role) };
  }

  _formatRole(role) {
    const json = role.toJSON();
    json.permissions = (role.permissions || []).map((p) => (p.toJSON ? p.toJSON() : p));
    json.permissionCount = json.permissions.length;
    return json;
  }

  _assertCanRead(requestedBy) {
    if (!requestedBy || ![UserRole.SUPER_ADMIN, UserRole.ADMIN].includes(requestedBy.role)) {
      throw new ForbiddenError('Insufficient permissions');
    }
  }

  _assertSuperAdmin(requestedBy) {
    if (!requestedBy || requestedBy.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenError('Only SUPER_ADMIN can manage roles');
    }
  }

  _assertCanAssign(requestedBy) {
    if (!requestedBy || ![UserRole.SUPER_ADMIN, UserRole.ADMIN].includes(requestedBy.role)) {
      throw new ForbiddenError('Insufficient permissions to assign roles');
    }
  }
}

module.exports = RoleService;

const {
  ConflictError,
  NotFoundError,
  ForbiddenError,
  BadRequestError,
} = require('../../../core/errors/AppError');
const { UserRole, ADMIN_ONLY_ROLES } = require('../../../shared/enums/userRole.enum');
const { AuditAction } = require('../../../shared/enums/auditAction.enum');
const { stripSensitive } = require('../../audit-logs/utils/audit.helper');
const {
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
  ALLOWED_SORT_FIELDS,
} = require('../../../shared/constants/pagination.constants');

/**
 * User Management Service — CRUD business logic with RBAC enforcement.
 */
class UserService {
  /**
   * @param {import('../../auth/repositories/user.repository')} userRepository
   */
  constructor(userRepository, auditService) {
    this.userRepository = userRepository;
    this.auditService = auditService;
  }

  async getUsers(queryParams, requestedBy) {
    this._assertCanManageUsers(requestedBy);

    const {
      page = DEFAULT_PAGE,
      limit = DEFAULT_LIMIT,
      search,
      role,
      isActive,
      isEmailVerified,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = queryParams;

    const result = await this.userRepository.findAll({
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      search,
      role,
      isActive: isActive !== undefined ? isActive === 'true' || isActive === true : undefined,
      isEmailVerified:
        isEmailVerified !== undefined
          ? isEmailVerified === 'true' || isEmailVerified === true
          : undefined,
      sortBy: ALLOWED_SORT_FIELDS.includes(sortBy) ? sortBy : 'createdAt',
      sortOrder: sortOrder === 'asc' ? 'asc' : 'desc',
    });

    return {
      users: result.users.map((user) => user.toJSON()),
      pagination: result.pagination,
    };
  }

  async getUserById(id, requestedBy) {
    this._assertCanManageUsers(requestedBy);

    const user = await this.userRepository.findById(id);
    if (!user) throw new NotFoundError('User not found');

    return user.toJSON();
  }

  async createUser(userData, requestedBy) {
    this._assertCanManageUsers(requestedBy);
    this._validateRoleAssignment(userData.role, requestedBy);

    const { email, phone } = userData;
    const [existingEmail, existingPhone] = await Promise.all([
      this.userRepository.findByEmail(email),
      this.userRepository.findByPhone(phone),
    ]);

    if (existingEmail) throw new ConflictError('Email already registered');
    if (existingPhone) throw new ConflictError('Phone number already registered');

    const user = await this.userRepository.create(userData);

    await this.auditService.log({
      action: AuditAction.CREATE,
      module: 'users',
      entityType: 'user',
      entityId: user._id,
      entityLabel: user.email,
      description: 'Admin created user',
      requestedBy,
      metadata: { role: user.role },
    });

    return user.toJSON();
  }

  async updateUser(id, updateData, requestedBy) {
    this._assertCanManageUsers(requestedBy);

    const user = await this.userRepository.findById(id);
    if (!user) throw new NotFoundError('User not found');

    if (updateData.role) {
      this._validateRoleAssignment(updateData.role, requestedBy);
      this._validateRoleChange(user.role, updateData.role, requestedBy);
    }

    if (updateData.email && updateData.email !== user.email) {
      const existingEmail = await this.userRepository.findByEmail(updateData.email);
      if (existingEmail && existingEmail._id.toString() !== id) {
        throw new ConflictError('Email already registered');
      }
    }

    if (updateData.phone && updateData.phone !== user.phone) {
      const existingPhone = await this.userRepository.findByPhone(updateData.phone);
      if (existingPhone && existingPhone._id.toString() !== id) {
        throw new ConflictError('Phone number already registered');
      }
    }

    // Prevent self-deactivation
    if (requestedBy.id === id && updateData.isActive === false) {
      throw new BadRequestError('You cannot deactivate your own account');
    }

    const updatedUser = await this.userRepository.updateById(id, updateData);

    await this.auditService.log({
      action: AuditAction.UPDATE,
      module: 'users',
      entityType: 'user',
      entityId: id,
      entityLabel: updatedUser.email,
      description: 'Admin updated user',
      requestedBy,
      metadata: { before: stripSensitive(user), after: stripSensitive(updatedUser) },
    });

    return updatedUser.toJSON();
  }

  async deleteUser(id, requestedBy) {
    this._assertCanManageUsers(requestedBy);

    const user = await this.userRepository.findById(id);
    if (!user) throw new NotFoundError('User not found');

    if (requestedBy.id === id) {
      throw new BadRequestError('You cannot delete your own account');
    }

    if (ADMIN_ONLY_ROLES.includes(user.role) && requestedBy.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenError('Only SUPER_ADMIN can delete admin users');
    }

    await this.userRepository.softDeleteById(id);

    await this.auditService.log({
      action: AuditAction.DELETE,
      module: 'users',
      entityType: 'user',
      entityId: id,
      entityLabel: user.email,
      description: 'Admin deactivated user',
      requestedBy,
      metadata: { role: user.role },
    });

    return { message: 'User deactivated successfully' };
  }

  _assertCanManageUsers(requestedBy) {
    if (!requestedBy || ![UserRole.SUPER_ADMIN, UserRole.ADMIN].includes(requestedBy.role)) {
      throw new ForbiddenError('Insufficient permissions to manage users');
    }
  }

  _validateRoleAssignment(targetRole, requestedBy) {
    if (ADMIN_ONLY_ROLES.includes(targetRole) && requestedBy.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenError('Only SUPER_ADMIN can assign admin roles');
    }
  }

  _validateRoleChange(currentRole, newRole, requestedBy) {
    if (
      (ADMIN_ONLY_ROLES.includes(currentRole) || ADMIN_ONLY_ROLES.includes(newRole)) &&
      requestedBy.role !== UserRole.SUPER_ADMIN
    ) {
      throw new ForbiddenError('Only SUPER_ADMIN can modify admin roles');
    }
  }
}

module.exports = UserService;

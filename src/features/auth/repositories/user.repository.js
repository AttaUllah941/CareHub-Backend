const User = require('../models/user.model');
const { hashPasswordResetToken } = require('../../../core/utils/crypto.utils');

/**
 * User Repository — data access layer for User entity.
 * Isolates Mongoose queries from business logic (Repository Pattern).
 */
class UserRepository {
  /**
   * @param {object} userData
   * @returns {Promise<import('mongoose').Document>}
   */
  async create(userData) {
    return User.create(userData);
  }

  /**
   * @param {string} email
   * @returns {Promise<import('mongoose').Document|null>}
   */
  async findByEmail(email) {
    return User.findOne({ email: email.toLowerCase() });
  }

  /**
   * Find user by email including password field (for auth).
   */
  async findByEmailWithPassword(email) {
    return User.findOne({ email: email.toLowerCase() }).select('+password');
  }

  /**
   * @param {string} id
   * @returns {Promise<import('mongoose').Document|null>}
   */
  async findById(id) {
    return User.findById(id);
  }

  /**
   * @param {string} id
   * @returns {Promise<import('mongoose').Document|null>}
   */
  async findByIdWithPassword(id) {
    return User.findById(id).select('+password +refreshToken');
  }

  /**
   * @param {string} phone
   * @returns {Promise<import('mongoose').Document|null>}
   */
  async findByPhone(phone) {
    return User.findOne({ phone });
  }

  /**
   * @param {string} id
   * @param {object} updateData
   * @returns {Promise<import('mongoose').Document|null>}
   */
  async updateById(id, updateData) {
    return User.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
  }

  /**
   * Find user by valid (non-expired) password reset token.
   */
  async findByPasswordResetToken(token) {
    const hashedToken = hashPasswordResetToken(token);
    return User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    }).select('+password +passwordResetToken +passwordResetExpires');
  }

  /**
   * Paginated user listing with search, sort, and filters.
   */
  async findAll({
    page = 1,
    limit = 20,
    search,
    role,
    isActive,
    isEmailVerified,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  }) {
    const filter = {};

    if (role) filter.role = role;
    if (isActive !== undefined) filter.isActive = isActive;
    if (isEmailVerified !== undefined) filter.isEmailVerified = isEmailVerified;

    if (search) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchRegex = new RegExp(escapedSearch, 'i');
      filter.$or = [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
      ];
    }

    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [users, total] = await Promise.all([
      User.find(filter).sort(sort).skip(skip).limit(limit),
      User.countDocuments(filter),
    ]);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Soft delete — deactivates user account.
   */
  async softDeleteById(id) {
    return User.findByIdAndUpdate(id, { isActive: false, refreshToken: null }, { new: true });
  }

  /**
   * Assign a role to a user — syncs roleId and role slug, invalidates refresh token.
   */
  async assignRole(id, roleId, roleSlug) {
    return User.findByIdAndUpdate(
      id,
      { roleId, role: roleSlug, refreshToken: null },
      { new: true, runValidators: true },
    );
  }
}

module.exports = UserRepository;

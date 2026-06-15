const Role = require('../models/role.model');

class RoleRepository {
  async create(data) {
    return Role.create(data);
  }

  async findById(id) {
    return Role.findById(id).populate('permissions');
  }

  async findBySlug(slug) {
    return Role.findOne({ slug: slug.toUpperCase() }).populate('permissions');
  }

  async updateById(id, data) {
    return Role.findByIdAndUpdate(id, data, { new: true, runValidators: true }).populate('permissions');
  }

  async softDeleteById(id) {
    return Role.findByIdAndUpdate(id, { isActive: false }, { new: true });
  }

  async findAll({ page = 1, limit = 20, search, isActive, isSystem, sortBy = 'createdAt', sortOrder = 'desc' }) {
    const filter = {};
    if (isActive !== undefined) filter.isActive = isActive;
    if (isSystem !== undefined) filter.isSystem = isSystem;

    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      filter.$or = [{ name: regex }, { slug: regex }, { description: regex }];
    }

    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [roles, total] = await Promise.all([
      Role.find(filter).populate('permissions').sort(sort).skip(skip).limit(limit),
      Role.countDocuments(filter),
    ]);

    return {
      roles,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  async assignPermissions(id, permissionIds) {
    return Role.findByIdAndUpdate(
      id,
      { permissions: permissionIds },
      { new: true, runValidators: true },
    ).populate('permissions');
  }
}

module.exports = RoleRepository;

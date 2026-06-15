const Permission = require('../models/permission.model');

class PermissionRepository {
  async create(data) {
    return Permission.create(data);
  }

  async findById(id) {
    return Permission.findById(id);
  }

  async findBySlug(slug) {
    return Permission.findOne({ slug: slug.toLowerCase() });
  }

  async updateById(id, data) {
    return Permission.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

  async softDeleteById(id) {
    return Permission.findByIdAndUpdate(id, { isActive: false }, { new: true });
  }

  async findAll({ page = 1, limit = 50, search, module, isActive, sortBy = 'module', sortOrder = 'asc' }) {
    const filter = {};
    if (module) filter.module = module;
    if (isActive !== undefined) filter.isActive = isActive;

    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      filter.$or = [{ name: regex }, { slug: regex }, { module: regex }];
    }

    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const [permissions, total] = await Promise.all([
      Permission.find(filter).sort(sort).skip(skip).limit(limit),
      Permission.countDocuments(filter),
    ]);

    return {
      permissions,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  async findAllActive() {
    return Permission.find({ isActive: true }).sort({ module: 1, name: 1 });
  }

  async findByIds(ids) {
    return Permission.find({ _id: { $in: ids }, isActive: true });
  }
}

module.exports = PermissionRepository;

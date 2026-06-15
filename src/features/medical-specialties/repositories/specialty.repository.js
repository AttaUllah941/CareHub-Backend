const Specialty = require('../models/specialty.model');

class SpecialtyRepository {
  async create(data) {
    return Specialty.create(data);
  }

  async findById(id) {
    return Specialty.findById(id);
  }

  async findBySlug(slug) {
    return Specialty.findOne({ slug: slug.toLowerCase() });
  }

  async updateById(id, data) {
    return Specialty.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

  async softDeleteById(id) {
    return Specialty.findByIdAndUpdate(id, { isActive: false }, { new: true });
  }

  async findAll({ page = 1, limit = 10, search, isActive, sortBy = 'name', sortOrder = 'asc' }) {
    const filter = {};
    if (isActive !== undefined) filter.isActive = isActive;

    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      filter.$or = [{ name: regex }, { slug: regex }, { description: regex }];
    }

    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const [specialties, total] = await Promise.all([
      Specialty.find(filter).sort(sort).skip(skip).limit(limit),
      Specialty.countDocuments(filter),
    ]);

    return {
      specialties,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  async findAllActive() {
    return Specialty.find({ isActive: true }).sort({ name: 1 });
  }
}

module.exports = SpecialtyRepository;

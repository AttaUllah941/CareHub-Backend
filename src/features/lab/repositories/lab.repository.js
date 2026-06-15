const Lab = require('../models/lab.model');

class LabRepository {
  async create(data) {
    return Lab.create(data);
  }

  async findById(id) {
    return Lab.findById(id);
  }

  async updateById(id, data) {
    return Lab.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

  async softDeleteById(id) {
    return Lab.findByIdAndUpdate(id, { isActive: false }, { new: true });
  }

  async findAll({ page = 1, limit = 10, search, city, homeCollectionAvailable, isActive, sortBy = 'name', sortOrder = 'asc' }) {
    const filter = {};
    if (isActive !== undefined) filter.isActive = isActive;
    if (city) filter.city = new RegExp(city.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    if (homeCollectionAvailable !== undefined) filter.homeCollectionAvailable = homeCollectionAvailable;

    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      filter.$or = [{ name: regex }, { city: regex }, { description: regex }];
    }

    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const [labs, total] = await Promise.all([
      Lab.find(filter).sort(sort).skip(skip).limit(limit),
      Lab.countDocuments(filter),
    ]);

    return {
      labs,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  }
}

module.exports = LabRepository;

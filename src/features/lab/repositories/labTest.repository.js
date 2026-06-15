const LabTest = require('../models/labTest.model');

const POPULATE = [{ path: 'labId', select: 'name city homeCollectionAvailable' }];

class LabTestRepository {
  async create(data) {
    const test = await LabTest.create(data);
    return test.populate(POPULATE);
  }

  async findById(id) {
    return LabTest.findById(id).populate(POPULATE);
  }

  async updateById(id, data) {
    return LabTest.findByIdAndUpdate(id, data, { new: true, runValidators: true }).populate(POPULATE);
  }

  async softDeleteById(id) {
    return LabTest.findByIdAndUpdate(id, { isActive: false }, { new: true }).populate(POPULATE);
  }

  async findAll({ page = 1, limit = 10, search, labId, category, homeCollectionAvailable, isActive, sortBy = 'name', sortOrder = 'asc' }) {
    const filter = {};
    if (isActive !== undefined) filter.isActive = isActive;
    if (labId) filter.labId = labId;
    if (category) filter.category = category;
    if (homeCollectionAvailable !== undefined) filter.homeCollectionAvailable = homeCollectionAvailable;

    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      filter.$or = [{ name: regex }, { code: regex }, { description: regex }];
    }

    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const [tests, total] = await Promise.all([
      LabTest.find(filter).populate(POPULATE).sort(sort).skip(skip).limit(limit),
      LabTest.countDocuments(filter),
    ]);

    return {
      tests,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  async findByIds(ids) {
    return LabTest.find({ _id: { $in: ids }, isActive: true }).populate(POPULATE);
  }
}

module.exports = LabTestRepository;

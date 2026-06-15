const Medicine = require('../models/medicine.model');

class MedicineRepository {
  async create(data) {
    return Medicine.create(data);
  }

  async findById(id) {
    return Medicine.findById(id);
  }

  async findBySku(sku) {
    if (!sku) return null;
    return Medicine.findOne({ sku, isActive: true });
  }

  async updateById(id, data) {
    return Medicine.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

  async softDeleteById(id) {
    return Medicine.findByIdAndUpdate(id, { isActive: false }, { new: true });
  }

  async findAll({ page = 1, limit = 10, search, category, requiresPrescription, isActive, sortBy = 'name', sortOrder = 'asc' }) {
    const filter = {};
    if (isActive !== undefined) filter.isActive = isActive;
    if (category) filter.category = category;
    if (requiresPrescription !== undefined) filter.requiresPrescription = requiresPrescription;

    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      filter.$or = [{ name: regex }, { genericName: regex }, { brandName: regex }, { sku: regex }];
    }

    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const [medicines, total] = await Promise.all([
      Medicine.find(filter).sort(sort).skip(skip).limit(limit),
      Medicine.countDocuments(filter),
    ]);

    return {
      medicines,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  async findByIds(ids) {
    return Medicine.find({ _id: { $in: ids }, isActive: true });
  }
}

module.exports = MedicineRepository;

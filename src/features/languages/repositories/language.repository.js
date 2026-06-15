const Language = require('../models/language.model');

class LanguageRepository {
  async create(data) {
    return Language.create(data);
  }

  async findById(id) {
    return Language.findById(id);
  }

  async findByCode(code) {
    return Language.findOne({ code: code.toLowerCase() });
  }

  async updateById(id, data) {
    return Language.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

  async softDeleteById(id) {
    return Language.findByIdAndUpdate(id, { isActive: false }, { new: true });
  }

  async findAll({ page = 1, limit = 10, search, isActive, sortBy = 'name', sortOrder = 'asc' }) {
    const filter = {};
    if (isActive !== undefined) filter.isActive = isActive;

    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      filter.$or = [{ name: regex }, { code: regex }, { nativeName: regex }, { description: regex }];
    }

    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const [languages, total] = await Promise.all([
      Language.find(filter).sort(sort).skip(skip).limit(limit),
      Language.countDocuments(filter),
    ]);

    return {
      languages,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  async findAllActive() {
    return Language.find({ isActive: true }).sort({ name: 1 });
  }
}

module.exports = LanguageRepository;

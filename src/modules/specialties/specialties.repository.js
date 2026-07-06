const { Specialty } = require('./specialties.model');

const findActive = (search) => {
  const filter = { isActive: true };

  if (search) {
    const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(escaped, 'i');
    filter.$or = [{ name: pattern }, { slug: pattern }, { description: pattern }];
  }

  return Specialty.find(filter).sort({ sortOrder: 1, name: 1 });
};

const findActiveBySlug = (slug) =>
  Specialty.findOne({ slug: slug.toLowerCase(), isActive: true });

const findById = (id) => Specialty.findById(id);

const findBySlug = (slug) => Specialty.findOne({ slug: slug.toLowerCase() });

const create = (data) => Specialty.create(data);

const updateById = (id, data) =>
  Specialty.findByIdAndUpdate(id, data, { new: true, runValidators: true });

const softDeleteById = (id) =>
  Specialty.findByIdAndUpdate(id, { isActive: false }, { new: true });

module.exports = {
  findActive,
  findActiveBySlug,
  findById,
  findBySlug,
  create,
  updateById,
  softDeleteById,
};

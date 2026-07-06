const { Specialty } = require('./specialties.model');

const findAllActive = () => Specialty.find({ isActive: true }).sort({ sortOrder: 1, name: 1 });

const findById = (id) => Specialty.findById(id);

const findBySlug = (slug) => Specialty.findOne({ slug: slug.toLowerCase() });

const findAll = ({ page, limit, skip, sort, search, isActive }) => {
  const filter = {};

  if (isActive !== undefined) {
    filter.isActive = isActive;
  }

  if (search) {
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'i');
    filter.$or = [{ name: regex }, { slug: regex }, { description: regex }];
  }

  return Promise.all([
    Specialty.find(filter).sort(sort).skip(skip).limit(limit),
    Specialty.countDocuments(filter),
  ]);
};

const create = (data) => Specialty.create(data);

const updateById = (id, data) =>
  Specialty.findByIdAndUpdate(id, data, { new: true, runValidators: true });

const softDeleteById = (id) =>
  Specialty.findByIdAndUpdate(id, { isActive: false }, { new: true, runValidators: true });

module.exports = {
  findAllActive,
  findById,
  findBySlug,
  findAll,
  create,
  updateById,
  softDeleteById,
};

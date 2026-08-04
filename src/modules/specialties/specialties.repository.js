const { Specialty } = require('./specialties.model');

const PUBLIC_LIST_FIELDS = 'name slug description icon isActive createdAt updatedAt sortOrder';

const findAllActive = (search) => {
  const filter = { isActive: true };

  if (search) {
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'i');
    filter.$or = [{ name: regex }, { slug: regex }, { description: regex }];
  }

  return Specialty.find(filter)
    .select(PUBLIC_LIST_FIELDS)
    .sort({ sortOrder: 1, name: 1 })
    .lean();
};

const findById = (id) => Specialty.findById(id);

const findBySlug = (slug) => Specialty.findOne({ slug: slug.toLowerCase() });

const findActiveBySlug = (slug) =>
  Specialty.findOne({ slug: slug.toLowerCase(), isActive: true })
    .select(PUBLIC_LIST_FIELDS)
    .lean();

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
  findActiveBySlug,
  findAll,
  create,
  updateById,
  softDeleteById,
};

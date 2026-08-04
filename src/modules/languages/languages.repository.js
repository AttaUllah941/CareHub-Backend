const { Language } = require('./languages.model');

const PUBLIC_LIST_FIELDS = 'name code isActive createdAt updatedAt';

const findActive = (search) => {
  const filter = { isActive: true };

  if (search) {
    const escaped = String(search).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(escaped, 'i');
    filter.$or = [{ name: pattern }, { code: pattern }];
  }

  return Language.find(filter).select(PUBLIC_LIST_FIELDS).sort({ name: 1 }).lean();
};

const findActiveByCode = (code) =>
  Language.findOne({ code: code.toLowerCase(), isActive: true })
    .select(PUBLIC_LIST_FIELDS)
    .lean();

const findById = (id) => Language.findById(id);

const findByCode = (code) => Language.findOne({ code: code.toLowerCase() });

const create = (data) => Language.create(data);

const updateById = (id, data) =>
  Language.findByIdAndUpdate(id, data, { new: true, runValidators: true });

const softDeleteById = (id) =>
  Language.findByIdAndUpdate(id, { isActive: false }, { new: true });

module.exports = {
  findActive,
  findActiveByCode,
  findById,
  findByCode,
  create,
  updateById,
  softDeleteById,
};

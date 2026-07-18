const { Language } = require('./languages.model');

const findActive = (search) => {
  const filter = { isActive: true };

  if (search) {
    const pattern = new RegExp(search.trim(), 'i');
    filter.$or = [{ name: pattern }, { code: pattern }];
  }

  return Language.find(filter).sort({ name: 1 });
};

const findActiveByCode = (code) =>
  Language.findOne({ code: code.toLowerCase(), isActive: true });

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

const MedicalSpecialty = require('./specialties.model');

const findActive = (search) => {
  const filter = { isActive: true };

  if (search) {
    const pattern = new RegExp(search.trim(), 'i');
    filter.$or = [{ name: pattern }, { slug: pattern }, { description: pattern }];
  }

  return MedicalSpecialty.find(filter).sort({ name: 1 });
};

const findActiveBySlug = (slug) =>
  MedicalSpecialty.findOne({ slug: slug.toLowerCase(), isActive: true });

const findById = (id) => MedicalSpecialty.findById(id);

const findBySlug = (slug) => MedicalSpecialty.findOne({ slug: slug.toLowerCase() });

const create = (data) => MedicalSpecialty.create(data);

const updateById = (id, data) =>
  MedicalSpecialty.findByIdAndUpdate(id, data, { new: true, runValidators: true });

const softDeleteById = (id) =>
  MedicalSpecialty.findByIdAndUpdate(id, { isActive: false }, { new: true });

module.exports = {
  findActive,
  findActiveBySlug,
  findById,
  findBySlug,
  create,
  updateById,
  softDeleteById,
};

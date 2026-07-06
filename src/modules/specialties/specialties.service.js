const { NotFoundError, ConflictError } = require('../../core/errors/AppError');
const specialtiesRepository = require('./specialties.repository');

const toSpecialtyResponse = (specialty) => ({
  id: specialty._id.toString(),
  name: specialty.name,
  slug: specialty.slug,
  description: specialty.description || '',
  icon: specialty.icon || '',
  isActive: specialty.isActive,
  createdAt: specialty.createdAt?.toISOString(),
  updatedAt: specialty.updatedAt?.toISOString(),
});

const listPublicSpecialties = async () => {
  const specialties = await specialtiesRepository.findAllActive();
  return { specialties: specialties.map(toSpecialtyResponse) };
};

const getSpecialtyById = async (id) => {
  const specialty = await specialtiesRepository.findById(id);
  if (!specialty || !specialty.isActive) {
    throw new NotFoundError('Medical specialty not found');
  }
  return { specialty: toSpecialtyResponse(specialty) };
};

const getSpecialtyBySlug = async (slug) => {
  const specialty = await specialtiesRepository.findBySlug(slug);
  if (!specialty || !specialty.isActive) {
    throw new NotFoundError('Medical specialty not found');
  }
  return { specialty: toSpecialtyResponse(specialty) };
};

const createSpecialty = async (data) => {
  const slug = data.slug.toLowerCase();
  const existing = await specialtiesRepository.findBySlug(slug);
  if (existing) {
    throw new ConflictError('Specialty slug already exists');
  }

  const specialty = await specialtiesRepository.create({ ...data, slug });
  return { specialty: toSpecialtyResponse(specialty) };
};

const updateSpecialty = async (id, data) => {
  const specialty = await specialtiesRepository.findById(id);
  if (!specialty) {
    throw new NotFoundError('Medical specialty not found');
  }

  if (data.slug && data.slug.toLowerCase() !== specialty.slug) {
    const existing = await specialtiesRepository.findBySlug(data.slug);
    if (existing) {
      throw new ConflictError('Specialty slug already exists');
    }
    data.slug = data.slug.toLowerCase();
  }

  const updated = await specialtiesRepository.updateById(id, data);
  return { specialty: toSpecialtyResponse(updated) };
};

const deleteSpecialty = async (id) => {
  const specialty = await specialtiesRepository.findById(id);
  if (!specialty) {
    throw new NotFoundError('Medical specialty not found');
  }

  await specialtiesRepository.softDeleteById(id);
  return { message: 'Medical specialty deactivated successfully' };
};

module.exports = {
  listPublicSpecialties,
  getSpecialtyById,
  getSpecialtyBySlug,
  createSpecialty,
  updateSpecialty,
  deleteSpecialty,
};

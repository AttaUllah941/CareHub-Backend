const AppError = require('../../shared/errors/AppError');
const { slugify } = require('../../shared/utils/slugify');
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

const resolveSlug = (name, slug) => {
  const value = slug ? slugify(slug) : slugify(name);

  if (!value) {
    throw new AppError('Unable to generate a valid slug', 422);
  }

  return value;
};

const listPublic = async (search) => {
  const specialties = await specialtiesRepository.findAllActive(search);
  return {
    specialties: specialties.map(toSpecialtyResponse),
  };
};

const getPublicBySlug = async (slug) => {
  const specialty = await specialtiesRepository.findActiveBySlug(slug);

  if (!specialty) {
    throw new AppError('Medical specialty not found', 404);
  }

  return { specialty: toSpecialtyResponse(specialty) };
};

const create = async (payload) => {
  const slug = resolveSlug(payload.name, payload.slug);

  const existing = await specialtiesRepository.findBySlug(slug);
  if (existing) {
    throw new AppError('Slug already exists', 409);
  }

  const specialty = await specialtiesRepository.create({
    name: payload.name,
    slug,
    description: payload.description,
    icon: payload.icon,
    isActive: true,
  });

  return { specialty: toSpecialtyResponse(specialty) };
};

const update = async (id, payload) => {
  const specialty = await specialtiesRepository.findById(id);

  if (!specialty) {
    throw new AppError('Medical specialty not found', 404);
  }

  const updates = { ...payload };

  if (payload.slug !== undefined) {
    updates.slug = resolveSlug(payload.name || specialty.name, payload.slug);

    if (updates.slug !== specialty.slug) {
      const existing = await specialtiesRepository.findBySlug(updates.slug);
      if (existing && existing._id.toString() !== id) {
        throw new AppError('Slug already exists', 409);
      }
    }
  }

  const updated = await specialtiesRepository.updateById(id, updates);
  return { specialty: toSpecialtyResponse(updated) };
};

const remove = async (id) => {
  const specialty = await specialtiesRepository.findById(id);

  if (!specialty) {
    throw new AppError('Medical specialty not found', 404);
  }

  if (!specialty.isActive) {
    throw new AppError('Medical specialty is already inactive', 400);
  }

  const updated = await specialtiesRepository.softDeleteById(id);
  return { specialty: toSpecialtyResponse(updated) };
};

module.exports = {
  listPublic,
  getPublicBySlug,
  create,
  update,
  remove,
};

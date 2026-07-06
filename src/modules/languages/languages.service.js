const AppError = require('../../shared/errors/AppError');
const slugify = require('../../shared/utils/slugify');
const languagesRepository = require('./languages.repository');

const toLanguageResponse = (language) => ({
  id: language._id.toString(),
  name: language.name,
  code: language.code,
  isActive: language.isActive,
  createdAt: language.createdAt?.toISOString(),
  updatedAt: language.updatedAt?.toISOString(),
});

const resolveCode = (code) => {
  const value = slugify(code);

  if (!value) {
    throw new AppError('Unable to generate a valid language code', 422);
  }

  return value;
};

const listPublic = async (search) => {
  const languages = await languagesRepository.findActive(search);
  return {
    languages: languages.map(toLanguageResponse),
  };
};

const getPublicByCode = async (code) => {
  const language = await languagesRepository.findActiveByCode(code);

  if (!language) {
    throw new AppError('Language not found', 404);
  }

  return { language: toLanguageResponse(language) };
};

const create = async (payload) => {
  const code = resolveCode(payload.code);

  const existing = await languagesRepository.findByCode(code);
  if (existing) {
    throw new AppError('Language code already exists', 409);
  }

  const language = await languagesRepository.create({
    name: payload.name,
    code,
    isActive: true,
  });

  return { language: toLanguageResponse(language) };
};

const update = async (id, payload) => {
  const language = await languagesRepository.findById(id);

  if (!language) {
    throw new AppError('Language not found', 404);
  }

  const updates = { ...payload };

  if (payload.code !== undefined) {
    updates.code = resolveCode(payload.code);

    if (updates.code !== language.code) {
      const existing = await languagesRepository.findByCode(updates.code);
      if (existing && existing._id.toString() !== id) {
        throw new AppError('Language code already exists', 409);
      }
    }
  }

  const updated = await languagesRepository.updateById(id, updates);
  return { language: toLanguageResponse(updated) };
};

const remove = async (id) => {
  const language = await languagesRepository.findById(id);

  if (!language) {
    throw new AppError('Language not found', 404);
  }

  if (!language.isActive) {
    throw new AppError('Language is already inactive', 400);
  }

  const updated = await languagesRepository.softDeleteById(id);
  return { language: toLanguageResponse(updated) };
};

module.exports = {
  listPublic,
  getPublicByCode,
  create,
  update,
  remove,
};

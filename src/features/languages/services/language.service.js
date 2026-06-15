const {
  ConflictError,
  NotFoundError,
  ForbiddenError,
} = require('../../../core/errors/AppError');
const { UserRole } = require('../../../shared/enums/userRole.enum');
const {
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
} = require('../../../shared/constants/pagination.constants');

class LanguageService {
  constructor(languageRepository) {
    this.languageRepository = languageRepository;
  }

  _assertCanRead(requestedBy) {
    if (!requestedBy || ![UserRole.SUPER_ADMIN, UserRole.ADMIN].includes(requestedBy.role)) {
      throw new ForbiddenError('Insufficient permissions');
    }
  }

  _assertCanWrite(requestedBy) {
    if (!requestedBy || ![UserRole.SUPER_ADMIN, UserRole.ADMIN].includes(requestedBy.role)) {
      throw new ForbiddenError('Insufficient permissions');
    }
  }

  async getLanguages(query, requestedBy) {
    this._assertCanRead(requestedBy);
    const result = await this.languageRepository.findAll({
      page: parseInt(query.page, 10) || DEFAULT_PAGE,
      limit: parseInt(query.limit, 10) || DEFAULT_LIMIT,
      search: query.search,
      isActive: query.isActive !== undefined ? query.isActive === 'true' : undefined,
      sortBy: query.sortBy || 'name',
      sortOrder: query.sortOrder || 'asc',
    });
    return {
      languages: result.languages.map((l) => l.toJSON()),
      pagination: result.pagination,
    };
  }

  async getAllActiveLanguages(requestedBy) {
    this._assertCanRead(requestedBy);
    const languages = await this.languageRepository.findAllActive();
    return languages.map((l) => l.toJSON());
  }

  async getLanguageById(id, requestedBy) {
    this._assertCanRead(requestedBy);
    const language = await this.languageRepository.findById(id);
    if (!language) throw new NotFoundError('Language not found');
    return language.toJSON();
  }

  async createLanguage(data, requestedBy) {
    this._assertCanWrite(requestedBy);
    const existing = await this.languageRepository.findByCode(data.code);
    if (existing) throw new ConflictError('Language code already exists');
    const language = await this.languageRepository.create({
      ...data,
      code: data.code.toLowerCase(),
    });
    return language.toJSON();
  }

  async updateLanguage(id, data, requestedBy) {
    this._assertCanWrite(requestedBy);
    const language = await this.languageRepository.findById(id);
    if (!language) throw new NotFoundError('Language not found');

    if (data.code && data.code !== language.code) {
      const existing = await this.languageRepository.findByCode(data.code);
      if (existing) throw new ConflictError('Language code already exists');
      data.code = data.code.toLowerCase();
    }

    const updated = await this.languageRepository.updateById(id, data);
    return updated.toJSON();
  }

  async deleteLanguage(id, requestedBy) {
    this._assertCanWrite(requestedBy);
    const language = await this.languageRepository.findById(id);
    if (!language) throw new NotFoundError('Language not found');
    await this.languageRepository.softDeleteById(id);
    return { message: 'Language deactivated successfully' };
  }
}

module.exports = LanguageService;

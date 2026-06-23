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

class SpecialtyService {
  constructor(specialtyRepository) {
    this.specialtyRepository = specialtyRepository;
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

  async getSpecialties(query, requestedBy) {
    this._assertCanRead(requestedBy);
    const result = await this.specialtyRepository.findAll({
      page: parseInt(query.page, 10) || DEFAULT_PAGE,
      limit: parseInt(query.limit, 10) || DEFAULT_LIMIT,
      search: query.search,
      isActive: query.isActive !== undefined ? query.isActive === 'true' : undefined,
      sortBy: query.sortBy || 'name',
      sortOrder: query.sortOrder || 'asc',
    });
    return {
      specialties: result.specialties.map((s) => s.toJSON()),
      pagination: result.pagination,
    };
  }

  async getAllActiveSpecialties(requestedBy) {
    this._assertCanRead(requestedBy);
    const specialties = await this.specialtyRepository.findAllActive();
    return specialties.map((s) => s.toJSON());
  }

  async getPublicSpecialties() {
    const specialties = await this.specialtyRepository.findAllActive();
    return specialties.map((s) => s.toJSON());
  }

  async getSpecialtyById(id, requestedBy) {
    this._assertCanRead(requestedBy);
    const specialty = await this.specialtyRepository.findById(id);
    if (!specialty) throw new NotFoundError('Medical specialty not found');
    return specialty.toJSON();
  }

  async createSpecialty(data, requestedBy) {
    this._assertCanWrite(requestedBy);
    const existing = await this.specialtyRepository.findBySlug(data.slug);
    if (existing) throw new ConflictError('Specialty slug already exists');
    const specialty = await this.specialtyRepository.create({
      ...data,
      slug: data.slug.toLowerCase(),
    });
    return specialty.toJSON();
  }

  async updateSpecialty(id, data, requestedBy) {
    this._assertCanWrite(requestedBy);
    const specialty = await this.specialtyRepository.findById(id);
    if (!specialty) throw new NotFoundError('Medical specialty not found');

    if (data.slug && data.slug !== specialty.slug) {
      const existing = await this.specialtyRepository.findBySlug(data.slug);
      if (existing) throw new ConflictError('Specialty slug already exists');
      data.slug = data.slug.toLowerCase();
    }

    const updated = await this.specialtyRepository.updateById(id, data);
    return updated.toJSON();
  }

  async deleteSpecialty(id, requestedBy) {
    this._assertCanWrite(requestedBy);
    const specialty = await this.specialtyRepository.findById(id);
    if (!specialty) throw new NotFoundError('Medical specialty not found');
    await this.specialtyRepository.softDeleteById(id);
    return { message: 'Medical specialty deactivated successfully' };
  }
}

module.exports = SpecialtyService;

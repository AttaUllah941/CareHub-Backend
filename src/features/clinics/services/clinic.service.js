const {
  ConflictError,
  NotFoundError,
  ForbiddenError,
  BadRequestError,
} = require('../../../core/errors/AppError');
const { UserRole } = require('../../../shared/enums/userRole.enum');
const {
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
} = require('../../../shared/constants/pagination.constants');
const {
  validateClinicWorkingHours,
  DEFAULT_CLINIC_WORKING_HOURS,
} = require('../utils/clinicWorkingHours.util');

class ClinicService {
  constructor(clinicRepository, doctorProfileRepository, userRepository) {
    this.clinicRepository = clinicRepository;
    this.doctorProfileRepository = doctorProfileRepository;
    this.userRepository = userRepository;
  }

  _isAdmin(requestedBy) {
    return requestedBy && [UserRole.SUPER_ADMIN, UserRole.ADMIN].includes(requestedBy.role);
  }

  _assertCanRead(requestedBy) {
    if (!this._isAdmin(requestedBy)) {
      throw new ForbiddenError('Insufficient permissions');
    }
  }

  _assertCanWrite(requestedBy) {
    if (!this._isAdmin(requestedBy)) {
      throw new ForbiddenError('Insufficient permissions');
    }
  }

  _formatDoctor(doctor) {
    const json = doctor.toJSON ? doctor.toJSON() : doctor;
    const user = json.userId;
    return {
      id: json.id || json._id?.toString(),
      userId: user?.id || user?._id?.toString() || json.userId?.toString(),
      title: json.title,
      licenseNumber: json.licenseNumber,
      verificationStatus: json.verificationStatus,
      isActive: json.isActive,
      user: user
        ? {
            id: user.id || user._id?.toString(),
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            phone: user.phone,
          }
        : undefined,
      specialties: json.specialtyIds,
    };
  }

  _format(clinic) {
    const json = clinic.toJSON ? clinic.toJSON() : clinic;
    const manager = json.managerId;

    return {
      ...json,
      managerId: manager?.id || manager?._id?.toString() || json.managerId?.toString() || null,
      manager: manager
        ? {
            id: manager.id || manager._id?.toString(),
            firstName: manager.firstName,
            lastName: manager.lastName,
            email: manager.email,
            phone: manager.phone,
          }
        : null,
      doctorProfileIds: (json.doctorProfileIds ?? []).map((d) =>
        typeof d === 'object' ? d.id || d._id?.toString() : d?.toString(),
      ),
      doctors: (json.doctorProfileIds ?? [])
        .filter((d) => typeof d === 'object')
        .map((d) => this._formatDoctor(d)),
      mapUrl:
        json.location?.latitude != null && json.location?.longitude != null
          ? `https://www.openstreetmap.org/?mlat=${json.location.latitude}&mlon=${json.location.longitude}#map=16/${json.location.latitude}/${json.location.longitude}`
          : null,
    };
  }

  _validateClinicData(data) {
    if (data.workingHours) {
      try {
        validateClinicWorkingHours(data.workingHours);
      } catch (err) {
        throw new BadRequestError(err.message);
      }
    }

    if (data.location) {
      const { latitude, longitude } = data.location;
      if (latitude != null && (latitude < -90 || latitude > 90)) {
        throw new BadRequestError('Latitude must be between -90 and 90');
      }
      if (longitude != null && (longitude < -180 || longitude > 180)) {
        throw new BadRequestError('Longitude must be between -180 and 180');
      }
    }
  }

  async _validateManager(managerId) {
    if (!managerId) return;
    const user = await this.userRepository.findById(managerId);
    if (!user) throw new NotFoundError('Manager user not found');
    if (user.role !== UserRole.CLINIC_MANAGER) {
      throw new BadRequestError('Manager must have CLINIC_MANAGER role');
    }

    const existing = await this.clinicRepository.findByManagerId(managerId);
    if (existing) {
      throw new ConflictError('This manager is already assigned to another clinic');
    }
  }

  async _validateDoctors(doctorProfileIds, clinicId = null) {
    if (!doctorProfileIds?.length) return [];

    const uniqueIds = [...new Set(doctorProfileIds.map(String))];
    const doctors = await Promise.all(uniqueIds.map((id) => this.doctorProfileRepository.findById(id)));

    for (let i = 0; i < doctors.length; i += 1) {
      if (!doctors[i]) throw new NotFoundError(`Doctor profile not found: ${uniqueIds[i]}`);
      if (!doctors[i].isActive) throw new BadRequestError(`Doctor is inactive: ${uniqueIds[i]}`);
    }

    return uniqueIds;
  }

  async _resolveOwnedClinic(requestedBy) {
    if (!requestedBy || requestedBy.role !== UserRole.CLINIC_MANAGER) {
      throw new ForbiddenError('Only clinic managers can access this resource');
    }

    const clinic = await this.clinicRepository.findByManagerId(requestedBy.id);
    if (!clinic) throw new NotFoundError('No clinic assigned to this manager');
    return clinic;
  }

  async getClinics(query, requestedBy) {
    this._assertCanRead(requestedBy);
    const result = await this.clinicRepository.findAll({
      page: parseInt(query.page, 10) || DEFAULT_PAGE,
      limit: parseInt(query.limit, 10) || DEFAULT_LIMIT,
      search: query.search,
      city: query.city,
      country: query.country,
      isActive: query.isActive !== undefined ? query.isActive === 'true' : undefined,
      sortBy: query.sortBy || 'name',
      sortOrder: query.sortOrder || 'asc',
    });

    return {
      clinics: result.clinics.map((c) => this._format(c)),
      pagination: result.pagination,
    };
  }

  async getAllActiveClinics(requestedBy) {
    if (
      !requestedBy ||
      ![UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.CLINIC_MANAGER, UserRole.DOCTOR, UserRole.PATIENT].includes(
        requestedBy.role,
      )
    ) {
      throw new ForbiddenError('Insufficient permissions');
    }

    const clinics = await this.clinicRepository.findAllActive();
    return clinics.map((c) => this._format(c));
  }

  async getClinicById(id, requestedBy) {
    this._assertCanRead(requestedBy);
    const clinic = await this.clinicRepository.findById(id);
    if (!clinic) throw new NotFoundError('Clinic not found');
    return this._format(clinic);
  }

  async getMyClinic(requestedBy) {
    const clinic = await this._resolveOwnedClinic(requestedBy);
    return this._format(clinic);
  }

  async createClinic(data, requestedBy) {
    this._assertCanWrite(requestedBy);
    this._validateClinicData(data);

    const existing = await this.clinicRepository.findBySlug(data.slug);
    if (existing) throw new ConflictError('Clinic slug already exists');

    if (data.managerId) {
      await this._validateManager(data.managerId);
    }

    if (data.doctorProfileIds) {
      data.doctorProfileIds = await this._validateDoctors(data.doctorProfileIds);
    }

    const clinic = await this.clinicRepository.create({
      ...data,
      slug: data.slug.toLowerCase(),
      workingHours: data.workingHours ?? DEFAULT_CLINIC_WORKING_HOURS,
    });

    return this._format(clinic);
  }

  async updateClinic(id, data, requestedBy) {
    this._assertCanWrite(requestedBy);
    const clinic = await this.clinicRepository.findById(id);
    if (!clinic) throw new NotFoundError('Clinic not found');

    this._validateClinicData(data);

    if (data.slug && data.slug !== clinic.slug) {
      const existing = await this.clinicRepository.findBySlug(data.slug);
      if (existing) throw new ConflictError('Clinic slug already exists');
      data.slug = data.slug.toLowerCase();
    }

    if (data.managerId && data.managerId !== clinic.managerId?.toString()) {
      const existingManager = await this.clinicRepository.findByManagerId(data.managerId);
      if (existingManager && existingManager._id.toString() !== id) {
        throw new ConflictError('This manager is already assigned to another clinic');
      }
      const user = await this.userRepository.findById(data.managerId);
      if (!user) throw new NotFoundError('Manager user not found');
      if (user.role !== UserRole.CLINIC_MANAGER) {
        throw new BadRequestError('Manager must have CLINIC_MANAGER role');
      }
    }

    if (data.doctorProfileIds) {
      data.doctorProfileIds = await this._validateDoctors(data.doctorProfileIds, id);
    }

    const updated = await this.clinicRepository.updateById(id, data);
    return this._format(updated);
  }

  async updateMyClinic(data, requestedBy) {
    const clinic = await this._resolveOwnedClinic(requestedBy);
    this._validateClinicData(data);

    delete data.managerId;
    delete data.slug;
    delete data.isActive;

    if (data.doctorProfileIds) {
      data.doctorProfileIds = await this._validateDoctors(data.doctorProfileIds, clinic._id.toString());
    }

    const updated = await this.clinicRepository.updateById(clinic._id, data);
    return this._format(updated);
  }

  async assignDoctors(id, doctorProfileIds, requestedBy) {
    this._assertCanWrite(requestedBy);
    const clinic = await this.clinicRepository.findById(id);
    if (!clinic) throw new NotFoundError('Clinic not found');

    const ids = await this._validateDoctors(doctorProfileIds, id);
    const updated = await this.clinicRepository.updateById(id, { doctorProfileIds: ids });
    return this._format(updated);
  }

  async assignMyDoctors(doctorProfileIds, requestedBy) {
    const clinic = await this._resolveOwnedClinic(requestedBy);
    const ids = await this._validateDoctors(doctorProfileIds, clinic._id.toString());
    const updated = await this.clinicRepository.updateById(clinic._id, { doctorProfileIds: ids });
    return this._format(updated);
  }

  async deleteClinic(id, requestedBy) {
    this._assertCanWrite(requestedBy);
    const clinic = await this.clinicRepository.findById(id);
    if (!clinic) throw new NotFoundError('Clinic not found');
    await this.clinicRepository.softDeleteById(id);
    return { message: 'Clinic deactivated successfully' };
  }
}

module.exports = ClinicService;

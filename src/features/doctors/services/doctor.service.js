const {
  ConflictError,
  NotFoundError,
  ForbiddenError,
  BadRequestError,
} = require('../../../core/errors/AppError');
const { UserRole } = require('../../../shared/enums/userRole.enum');
const { DoctorVerificationStatus } = require('../../../shared/enums/doctorVerificationStatus.enum');
const { AuditAction } = require('../../../shared/enums/auditAction.enum');
const { stripSensitive } = require('../../audit-logs/utils/audit.helper');
const {
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
} = require('../../../shared/constants/pagination.constants');

class DoctorService {
  constructor(doctorProfileRepository, userRepository, specialtyRepository, languageRepository, auditService) {
    this.doctorProfileRepository = doctorProfileRepository;
    this.userRepository = userRepository;
    this.specialtyRepository = specialtyRepository;
    this.languageRepository = languageRepository;
    this.auditService = auditService;
  }

  _assertAdmin(requestedBy) {
    if (!requestedBy || ![UserRole.SUPER_ADMIN, UserRole.ADMIN].includes(requestedBy.role)) {
      throw new ForbiddenError('Insufficient permissions');
    }
  }

  _assertDoctor(requestedBy) {
    if (!requestedBy || requestedBy.role !== UserRole.DOCTOR) {
      throw new ForbiddenError('Only doctors can access this resource');
    }
  }

  _formatDoctor(profile) {
    const json = profile.toJSON ? profile.toJSON() : profile;
    const user = json.userId;
    return {
      ...json,
      user: user && typeof user === 'object' ? user : undefined,
      userId: user && typeof user === 'object' ? user.id || user._id?.toString() : json.userId,
      specialties: json.specialtyIds || [],
      specialtyIds: (json.specialtyIds || []).map((s) => (typeof s === 'object' ? s.id : s)),
      languages: json.languageIds || [],
      languageIds: (json.languageIds || []).map((l) => (typeof l === 'object' ? l.id : l)),
    };
  }

  _formatSearchDoctor(profile) {
    const user = profile.userId;
    const userId = user && typeof user === 'object' ? user._id?.toString() || user.id : profile.userId?.toString();

    return {
      id: profile._id?.toString() || profile.id,
      userId,
      user:
        user && typeof user === 'object'
          ? {
              id: userId,
              firstName: user.firstName,
              lastName: user.lastName,
            }
          : undefined,
      gender: profile.gender,
      city: profile.city,
      country: profile.country,
      title: profile.title,
      yearsOfExperience: profile.yearsOfExperience,
      consultationFee: profile.consultationFee,
      currency: profile.currency,
      profileImageUrl: profile.profileImageUrl,
      about: profile.about,
      qualifications: (profile.qualifications || []).map((q) => ({
        degree: q.degree,
        institution: q.institution,
        year: q.year,
      })),
      specialties: (profile.specialtyIds || []).map((s) =>
        typeof s === 'object'
          ? { id: s._id?.toString() || s.id, name: s.name, slug: s.slug }
          : { id: s.toString() },
      ),
      specialtyIds: (profile.specialtyIds || []).map((s) =>
        typeof s === 'object' ? s._id?.toString() || s.id : s.toString(),
      ),
      languages: (profile.languageIds || []).map((l) =>
        typeof l === 'object'
          ? { id: l._id?.toString() || l.id, name: l.name, code: l.code }
          : { id: l.toString() },
      ),
      languageIds: (profile.languageIds || []).map((l) =>
        typeof l === 'object' ? l._id?.toString() || l.id : l.toString(),
      ),
      clinics: profile.clinics || [],
      availableDays: profile.availableDays || [],
    };
  }

  _assertCanSearch(requestedBy) {
    const allowed = [
      UserRole.SUPER_ADMIN,
      UserRole.ADMIN,
      UserRole.DOCTOR,
      UserRole.PATIENT,
      UserRole.CLINIC_MANAGER,
    ];
    if (!requestedBy || !allowed.includes(requestedBy.role)) {
      throw new ForbiddenError('Insufficient permissions');
    }
  }

  async _validateReferences({ specialtyIds = [], languageIds = [] }) {
    if (specialtyIds.length) {
      const Specialty = require('../../medical-specialties/models/specialty.model');
      const count = await Specialty.countDocuments({ _id: { $in: specialtyIds }, isActive: true });
      if (count !== specialtyIds.length) {
        throw new BadRequestError('One or more specialties are invalid');
      }
    }
    if (languageIds.length) {
      const Language = require('../../languages/models/language.model');
      const count = await Language.countDocuments({ _id: { $in: languageIds }, isActive: true });
      if (count !== languageIds.length) {
        throw new BadRequestError('One or more languages are invalid');
      }
    }
  }

  async getDoctors(query, requestedBy) {
    this._assertAdmin(requestedBy);
    const result = await this.doctorProfileRepository.findAll({
      page: parseInt(query.page, 10) || DEFAULT_PAGE,
      limit: parseInt(query.limit, 10) || DEFAULT_LIMIT,
      search: query.search,
      verificationStatus: query.verificationStatus,
      specialtyId: query.specialtyId,
      isActive: query.isActive !== undefined ? query.isActive === 'true' : undefined,
      sortBy: query.sortBy || 'createdAt',
      sortOrder: query.sortOrder || 'desc',
    });
    return {
      doctors: result.doctors.map((d) => this._formatDoctor(d)),
      pagination: result.pagination,
    };
  }

  async searchDoctors(query, requestedBy) {
    this._assertCanSearch(requestedBy);
    return this._executeSearch(query);
  }

  async searchPublicDoctors(query) {
    return this._executeSearch(query);
  }

  async _resolveSpecialtyId(query) {
    if (query.specialtyId) return query.specialtyId;
    if (!query.specialtySlug) return undefined;

    const slug = query.specialtySlug.toLowerCase();
    const specialty = await this.specialtyRepository.findBySlug(slug);
    if (specialty) return specialty._id?.toString() || specialty.id;

    // Common marketplace aliases (e.g. dermatologist → dermatology)
    const aliasMap = {
      dermatologist: 'dermatology',
      gynecologist: 'gynecology',
      urologist: 'urology',
      gastroenterologist: 'gastroenterology',
      'general-practitioner': 'general-medicine',
      'general-physician': 'general-medicine',
      psychiatrist: 'psychiatry',
      psychologist: 'psychiatry',
      pediatrician: 'pediatrics',
      nutritionist: 'nutrition',
      cardiologist: 'cardiology',
      neurologist: 'neurology',
      'orthopedic-surgeon': 'orthopedic',
      pulmonologist: 'pulmonology',
      ophthalmologist: 'ophthalmology',
    };
    const mapped = aliasMap[slug];
    if (!mapped) return undefined;

    const mappedSpecialty = await this.specialtyRepository.findBySlug(mapped);
    return mappedSpecialty?._id?.toString() || mappedSpecialty?.id;
  }

  async _executeSearch(query) {
    const specialtyId = await this._resolveSpecialtyId(query);

    const result = await this.doctorProfileRepository.searchPublic({
      page: parseInt(query.page, 10) || DEFAULT_PAGE,
      limit: parseInt(query.limit, 10) || DEFAULT_LIMIT,
      name: query.name,
      specialtyId,
      clinicId: query.clinicId,
      city: query.city,
      minFee: query.minFee !== undefined ? parseFloat(query.minFee) : undefined,
      maxFee: query.maxFee !== undefined ? parseFloat(query.maxFee) : undefined,
      languageId: query.languageId,
      gender: query.gender,
      minExperience: query.minExperience !== undefined ? parseInt(query.minExperience, 10) : undefined,
      maxExperience: query.maxExperience !== undefined ? parseInt(query.maxExperience, 10) : undefined,
      availableDay: query.availableDay !== undefined ? parseInt(query.availableDay, 10) : undefined,
      availableDate: query.availableDate,
      sortBy: query.sortBy || 'yearsOfExperience',
      sortOrder: query.sortOrder || 'desc',
    });

    return {
      doctors: result.doctors.map((d) => this._formatSearchDoctor(d)),
      pagination: result.pagination,
    };
  }

  async getDoctorById(id, requestedBy) {
    const profile = await this.doctorProfileRepository.findById(id);
    if (!profile) throw new NotFoundError('Doctor profile not found');

    const isAdmin = [UserRole.SUPER_ADMIN, UserRole.ADMIN].includes(requestedBy?.role);
    const isOwner =
      requestedBy?.role === UserRole.DOCTOR &&
      profile.userId &&
      (profile.userId._id?.toString() === requestedBy.id ||
        profile.userId.id === requestedBy.id ||
        profile.userId.toString() === requestedBy.id);

    if (!isAdmin && !isOwner) {
      throw new ForbiddenError('Insufficient permissions');
    }

    return this._formatDoctor(profile);
  }

  async getMyProfile(requestedBy) {
    this._assertDoctor(requestedBy);
    const profile = await this.doctorProfileRepository.findByUserId(requestedBy.id);
    if (!profile) throw new NotFoundError('Doctor profile not found. Please complete your profile.');
    return this._formatDoctor(profile);
  }

  async createDoctor(data, requestedBy) {
    this._assertAdmin(requestedBy);

    const { firstName, lastName, email, phone, password, ...profileData } = data;

    const [existingEmail, existingPhone] = await Promise.all([
      this.userRepository.findByEmail(email),
      this.userRepository.findByPhone(phone),
    ]);
    if (existingEmail) throw new ConflictError('Email already registered');
    if (existingPhone) throw new ConflictError('Phone number already registered');

    await this._validateReferences(profileData);

    const user = await this.userRepository.create({
      firstName,
      lastName,
      email,
      phone,
      password,
      role: UserRole.DOCTOR,
    });

    const existingProfile = await this.doctorProfileRepository.findByUserId(user._id);
    if (existingProfile) throw new ConflictError('Doctor profile already exists for this user');

    const profile = await this.doctorProfileRepository.create({
      userId: user._id,
      ...profileData,
      verificationStatus: DoctorVerificationStatus.PENDING,
    });

    return this._formatDoctor(profile);
  }

  async updateDoctor(id, data, requestedBy) {
    this._assertAdmin(requestedBy);

    const profile = await this.doctorProfileRepository.findById(id);
    if (!profile) throw new NotFoundError('Doctor profile not found');

    const { firstName, lastName, email, phone, isActive, ...profileData } = data;
    const userId = profile.userId._id || profile.userId;

    if (email) {
      const existingEmail = await this.userRepository.findByEmail(email);
      if (existingEmail && existingEmail._id.toString() !== userId.toString()) {
        throw new ConflictError('Email already registered');
      }
    }
    if (phone) {
      const existingPhone = await this.userRepository.findByPhone(phone);
      if (existingPhone && existingPhone._id.toString() !== userId.toString()) {
        throw new ConflictError('Phone number already registered');
      }
    }

    await this._validateReferences(profileData);

    if (firstName || lastName || email || phone || isActive !== undefined) {
      await this.userRepository.updateById(userId, {
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(email && { email }),
        ...(phone && { phone }),
        ...(isActive !== undefined && { isActive }),
      });
    }

    const updated = await this.doctorProfileRepository.updateById(id, profileData);

    await this.auditService.log({
      action: AuditAction.UPDATE,
      module: 'doctors',
      entityType: 'doctor',
      entityId: id,
      entityLabel: profile.userId?.email || id,
      description: 'Doctor profile updated',
      requestedBy,
      metadata: { before: stripSensitive(profile), after: stripSensitive(updated) },
    });

    return this._formatDoctor(updated);
  }

  async createMyProfile(data, requestedBy) {
    this._assertDoctor(requestedBy);

    const existing = await this.doctorProfileRepository.findByUserId(requestedBy.id);
    if (existing) throw new ConflictError('Doctor profile already exists');

    await this._validateReferences(data);

    const profile = await this.doctorProfileRepository.create({
      userId: requestedBy.id,
      ...data,
      verificationStatus: DoctorVerificationStatus.PENDING,
    });

    return this._formatDoctor(profile);
  }

  async updateMyProfile(data, requestedBy) {
    this._assertDoctor(requestedBy);

    const profile = await this.doctorProfileRepository.findByUserId(requestedBy.id);
    if (!profile) throw new NotFoundError('Doctor profile not found');

    await this._validateReferences(data);

    const { verificationStatus, verificationNotes, isActive, ...allowed } = data;
    const updated = await this.doctorProfileRepository.updateById(profile._id, allowed);
    return this._formatDoctor(updated);
  }

  async verifyDoctor(id, data, requestedBy) {
    this._assertAdmin(requestedBy);

    const profile = await this.doctorProfileRepository.findById(id);
    if (!profile) throw new NotFoundError('Doctor profile not found');

    const updated = await this.doctorProfileRepository.updateById(id, {
      verificationStatus: data.verificationStatus,
      verificationNotes: data.verificationNotes,
    });

    const isApproved = data.verificationStatus === DoctorVerificationStatus.VERIFIED;
    await this.auditService.log({
      action: isApproved ? AuditAction.APPROVE : AuditAction.REJECT,
      module: 'doctors',
      entityType: 'doctor',
      entityId: id,
      entityLabel: profile.userId?.email || profile.userId?.firstName,
      description: `Doctor verification ${data.verificationStatus.toLowerCase()}`,
      requestedBy,
      metadata: {
        verificationStatus: data.verificationStatus,
        verificationNotes: data.verificationNotes,
        previousStatus: profile.verificationStatus,
      },
    });

    return this._formatDoctor(updated);
  }

  async deleteDoctor(id, requestedBy) {
    this._assertAdmin(requestedBy);

    const profile = await this.doctorProfileRepository.findById(id);
    if (!profile) throw new NotFoundError('Doctor profile not found');

    const userId = profile.userId._id || profile.userId;
    await this.doctorProfileRepository.softDeleteById(id);
    await this.userRepository.softDeleteById(userId);

    await this.auditService.log({
      action: AuditAction.DELETE,
      module: 'doctors',
      entityType: 'doctor',
      entityId: id,
      entityLabel: profile.userId?.email,
      description: 'Doctor deactivated',
      requestedBy,
    });

    return { message: 'Doctor deactivated successfully' };
  }
}

module.exports = DoctorService;

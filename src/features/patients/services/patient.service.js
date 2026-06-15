const {
  ConflictError,
  NotFoundError,
  ForbiddenError,
} = require('../../../core/errors/AppError');
const { UserRole } = require('../../../shared/enums/userRole.enum');
const { AuditAction } = require('../../../shared/enums/auditAction.enum');
const { stripSensitive } = require('../../audit-logs/utils/audit.helper');
const {
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
} = require('../../../shared/constants/pagination.constants');

class PatientService {
  constructor(patientProfileRepository, userRepository, auditService) {
    this.patientProfileRepository = patientProfileRepository;
    this.userRepository = userRepository;
    this.auditService = auditService;
  }

  _assertAdmin(requestedBy) {
    if (!requestedBy || ![UserRole.SUPER_ADMIN, UserRole.ADMIN].includes(requestedBy.role)) {
      throw new ForbiddenError('Insufficient permissions');
    }
  }

  _assertPatient(requestedBy) {
    if (!requestedBy || requestedBy.role !== UserRole.PATIENT) {
      throw new ForbiddenError('Only patients can access this resource');
    }
  }

  _formatPatient(profile) {
    const json = profile.toJSON();
    const user = json.userId;
    return {
      ...json,
      user: user && typeof user === 'object' ? user : undefined,
      userId: user && typeof user === 'object' ? user.id || user._id?.toString() : json.userId,
    };
  }

  _canReadProfile(profile, requestedBy) {
    const isAdmin = [UserRole.SUPER_ADMIN, UserRole.ADMIN].includes(requestedBy?.role);
    const isDoctor = requestedBy?.role === UserRole.DOCTOR;
    const userId = profile.userId?._id?.toString() || profile.userId?.id || profile.userId?.toString();
    const isOwner = requestedBy?.role === UserRole.PATIENT && userId === requestedBy.id;

    return isAdmin || isDoctor || isOwner;
  }

  async getPatients(query, requestedBy) {
    this._assertAdmin(requestedBy);
    const result = await this.patientProfileRepository.findAll({
      page: parseInt(query.page, 10) || DEFAULT_PAGE,
      limit: parseInt(query.limit, 10) || DEFAULT_LIMIT,
      search: query.search,
      bloodGroup: query.bloodGroup,
      isActive: query.isActive !== undefined ? query.isActive === 'true' : undefined,
      sortBy: query.sortBy || 'createdAt',
      sortOrder: query.sortOrder || 'desc',
    });
    return {
      patients: result.patients.map((p) => this._formatPatient(p)),
      pagination: result.pagination,
    };
  }

  async getPatientById(id, requestedBy) {
    const profile = await this.patientProfileRepository.findById(id);
    if (!profile) throw new NotFoundError('Patient profile not found');

    if (!this._canReadProfile(profile, requestedBy)) {
      throw new ForbiddenError('Insufficient permissions');
    }

    return this._formatPatient(profile);
  }

  async getMyProfile(requestedBy) {
    this._assertPatient(requestedBy);
    const profile = await this.patientProfileRepository.findByUserId(requestedBy.id);
    if (!profile) throw new NotFoundError('Patient profile not found. Please complete your profile.');
    return this._formatPatient(profile);
  }

  async createPatient(data, requestedBy) {
    this._assertAdmin(requestedBy);

    const { firstName, lastName, email, phone, password, ...profileData } = data;

    const [existingEmail, existingPhone] = await Promise.all([
      this.userRepository.findByEmail(email),
      this.userRepository.findByPhone(phone),
    ]);
    if (existingEmail) throw new ConflictError('Email already registered');
    if (existingPhone) throw new ConflictError('Phone number already registered');

    const user = await this.userRepository.create({
      firstName,
      lastName,
      email,
      phone,
      password,
      role: UserRole.PATIENT,
    });

    const existingProfile = await this.patientProfileRepository.findByUserId(user._id);
    if (existingProfile) throw new ConflictError('Patient profile already exists for this user');

    const profile = await this.patientProfileRepository.create({
      userId: user._id,
      ...profileData,
    });

    return this._formatPatient(profile);
  }

  async updatePatient(id, data, requestedBy) {
    this._assertAdmin(requestedBy);

    const profile = await this.patientProfileRepository.findById(id);
    if (!profile) throw new NotFoundError('Patient profile not found');

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

    if (firstName || lastName || email || phone || isActive !== undefined) {
      await this.userRepository.updateById(userId, {
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(email && { email }),
        ...(phone && { phone }),
        ...(isActive !== undefined && { isActive }),
      });
    }

    const updated = await this.patientProfileRepository.updateById(id, profileData);

    await this.auditService.log({
      action: AuditAction.UPDATE,
      module: 'patients',
      entityType: 'patient',
      entityId: id,
      entityLabel: profile.userId?.email || id,
      description: 'Patient profile updated',
      requestedBy,
      metadata: { before: stripSensitive(profile), after: stripSensitive(updated) },
    });

    return this._formatPatient(updated);
  }

  async createMyProfile(data, requestedBy) {
    this._assertPatient(requestedBy);

    const existing = await this.patientProfileRepository.findByUserId(requestedBy.id);
    if (existing) throw new ConflictError('Patient profile already exists');

    const profile = await this.patientProfileRepository.create({
      userId: requestedBy.id,
      ...data,
    });

    return this._formatPatient(profile);
  }

  async updateMyProfile(data, requestedBy) {
    this._assertPatient(requestedBy);

    const profile = await this.patientProfileRepository.findByUserId(requestedBy.id);
    if (!profile) throw new NotFoundError('Patient profile not found');

    const { isActive, ...allowed } = data;
    const updated = await this.patientProfileRepository.updateById(profile._id, allowed);
    return this._formatPatient(updated);
  }

  async deletePatient(id, requestedBy) {
    this._assertAdmin(requestedBy);

    const profile = await this.patientProfileRepository.findById(id);
    if (!profile) throw new NotFoundError('Patient profile not found');

    const userId = profile.userId._id || profile.userId;
    await this.patientProfileRepository.softDeleteById(id);
    await this.userRepository.softDeleteById(userId);

    await this.auditService.log({
      action: AuditAction.DELETE,
      module: 'patients',
      entityType: 'patient',
      entityId: id,
      entityLabel: profile.userId?.email,
      description: 'Patient deactivated',
      requestedBy,
    });

    return { message: 'Patient deactivated successfully' };
  }
}

module.exports = PatientService;

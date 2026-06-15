const path = require('path');
const {
  NotFoundError,
  ForbiddenError,
  BadRequestError,
} = require('../../../core/errors/AppError');
const { UserRole } = require('../../../shared/enums/userRole.enum');
const {
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
} = require('../../../shared/constants/pagination.constants');

class MedicalRecordService {
  constructor(
    medicalRecordRepository,
    patientProfileRepository,
    familyMemberRepository,
    consultationRepository,
    appointmentRepository,
    fileStorageService,
  ) {
    this.medicalRecordRepository = medicalRecordRepository;
    this.patientProfileRepository = patientProfileRepository;
    this.familyMemberRepository = familyMemberRepository;
    this.consultationRepository = consultationRepository;
    this.appointmentRepository = appointmentRepository;
    this.fileStorageService = fileStorageService;
  }

  _isAdmin(requestedBy) {
    return requestedBy && [UserRole.SUPER_ADMIN, UserRole.ADMIN].includes(requestedBy.role);
  }

  _format(record) {
    const json = record.toJSON ? record.toJSON() : record;
    const patient = json.patientProfileId;
    const familyMember = json.familyMemberId;
    const uploadedBy = json.uploadedByUserId;

    return {
      ...json,
      patientProfileId:
        patient?.id || patient?._id?.toString() || json.patientProfileId?.toString(),
      familyMemberId: familyMember
        ? familyMember.id || familyMember._id?.toString()
        : json.familyMemberId || null,
      consultationId: json.consultationId?.id || json.consultationId?._id?.toString() || json.consultationId?.toString() || null,
      appointmentId: json.appointmentId?.id || json.appointmentId?._id?.toString() || json.appointmentId?.toString() || null,
      uploadedByUserId:
        uploadedBy?.id || uploadedBy?._id?.toString() || json.uploadedByUserId?.toString(),
      patient:
        patient && typeof patient === 'object'
          ? {
              id: patient.id || patient._id?.toString(),
              user: patient.userId,
            }
          : undefined,
      familyMember:
        familyMember && typeof familyMember === 'object'
          ? {
              id: familyMember.id || familyMember._id?.toString(),
              firstName: familyMember.firstName,
              lastName: familyMember.lastName,
              relationship: familyMember.relationship,
            }
          : undefined,
      uploadedBy:
        uploadedBy && typeof uploadedBy === 'object'
          ? {
              id: uploadedBy.id || uploadedBy._id?.toString(),
              firstName: uploadedBy.firstName,
              lastName: uploadedBy.lastName,
              email: uploadedBy.email,
            }
          : undefined,
    };
  }

  async _resolvePatientProfileByUser(userId) {
    const profile = await this.patientProfileRepository.findByUserId(userId);
    if (!profile) throw new NotFoundError('Patient profile not found');
    return profile;
  }

  _canAccessRecord(record, requestedBy) {
    if (this._isAdmin(requestedBy)) return true;

    const patientUserId =
      record.patientProfileId?.userId?._id?.toString() ||
      record.patientProfileId?.userId?.id ||
      record.patientProfileId?.userId?.toString();

    if (requestedBy?.role === UserRole.PATIENT && patientUserId === requestedBy.id) {
      return true;
    }

    if (requestedBy?.role === UserRole.DOCTOR) {
      return true;
    }

    return false;
  }

  async _validatePatientAccess(patientProfileId, requestedBy) {
    const profile = await this.patientProfileRepository.findById(patientProfileId);
    if (!profile) throw new NotFoundError('Patient profile not found');

    if (this._isAdmin(requestedBy) || requestedBy?.role === UserRole.DOCTOR) return profile;

    if (requestedBy?.role === UserRole.PATIENT) {
      const userId = profile.userId?._id?.toString() || profile.userId?.toString();
      if (userId !== requestedBy.id) throw new ForbiddenError('Insufficient permissions');
      return profile;
    }

    throw new ForbiddenError('Insufficient permissions');
  }

  async _resolveLinks({ consultationId, appointmentId, familyMemberId, patientProfileId }) {
    let resolvedAppointmentId = appointmentId || null;
    let resolvedConsultationId = consultationId || null;

    if (consultationId) {
      const consultation = await this.consultationRepository.findById(consultationId);
      if (!consultation) throw new NotFoundError('Consultation not found');
      resolvedAppointmentId =
        consultation.appointmentId?._id?.toString() || consultation.appointmentId?.toString();
      const apptPatientId =
        consultation.appointmentId?.patientProfileId?._id?.toString() ||
        consultation.appointmentId?.patientProfileId?.toString();
      if (apptPatientId && apptPatientId !== patientProfileId.toString()) {
        throw new BadRequestError('Consultation does not belong to this patient');
      }
    }

    if (appointmentId && !consultationId) {
      const appointment = await this.appointmentRepository.findById(appointmentId);
      if (!appointment) throw new NotFoundError('Appointment not found');
      const apptPatientId =
        appointment.patientProfileId?._id?.toString() || appointment.patientProfileId?.toString();
      if (apptPatientId !== patientProfileId.toString()) {
        throw new BadRequestError('Appointment does not belong to this patient');
      }
    }

    if (familyMemberId) {
      const member = await this.familyMemberRepository.findById(familyMemberId);
      if (!member) throw new NotFoundError('Family member not found');
      const memberPatientId = member.patientProfileId?._id?.toString() || member.patientProfileId?.toString();
      if (memberPatientId !== patientProfileId.toString()) {
        throw new BadRequestError('Family member does not belong to this patient');
      }
    }

    return { consultationId: resolvedConsultationId, appointmentId: resolvedAppointmentId };
  }

  _fileMetaFromUpload(file, patientProfileId) {
    const storagePath = this.fileStorageService.buildStoragePath(patientProfileId, file.filename);
    return {
      fileName: file.filename,
      originalFileName: file.originalname,
      mimeType: file.mimetype,
      fileSize: file.size,
      storagePath,
    };
  }

  async uploadRecord(file, data, requestedBy) {
    if (!file) throw new BadRequestError('File is required');

    let patientProfileId = data.patientProfileId;

    if (requestedBy?.role === UserRole.PATIENT) {
      const profile = await this._resolvePatientProfileByUser(requestedBy.id);
      patientProfileId = profile._id.toString();
    } else if (!patientProfileId) {
      throw new BadRequestError('patientProfileId is required');
    }

    await this._validatePatientAccess(patientProfileId, requestedBy);
    const links = await this._resolveLinks({ ...data, patientProfileId });
    const fileMeta = this._fileMetaFromUpload(file, patientProfileId);

    const record = await this.medicalRecordRepository.create({
      patientProfileId,
      familyMemberId: data.familyMemberId || null,
      consultationId: links.consultationId,
      appointmentId: links.appointmentId,
      recordType: data.recordType,
      title: data.title,
      description: data.description,
      ...fileMeta,
      uploadedByUserId: requestedBy.id,
    });

    return this._format(record);
  }

  async uploadNewVersion(id, file, data, requestedBy) {
    if (!file) throw new BadRequestError('File is required');

    const record = await this.medicalRecordRepository.findById(id);
    if (!record || !record.isActive) throw new NotFoundError('Medical record not found');
    if (!this._canAccessRecord(record, requestedBy)) throw new ForbiddenError('Insufficient permissions');

    const patientProfileId = record.patientProfileId._id || record.patientProfileId;
    const fileMeta = this._fileMetaFromUpload(file, patientProfileId);

    const historyEntry = {
      version: record.version,
      fileName: record.fileName,
      originalFileName: record.originalFileName,
      mimeType: record.mimeType,
      fileSize: record.fileSize,
      storagePath: record.storagePath,
      uploadedByUserId: record.uploadedByUserId._id || record.uploadedByUserId,
      changeNote: data.changeNote,
      uploadedAt: record.updatedAt || record.createdAt,
    };

    const updated = await this.medicalRecordRepository.updateById(id, {
      ...fileMeta,
      version: record.version + 1,
      history: [...(record.history ?? []), historyEntry],
      uploadedByUserId: requestedBy.id,
    });

    return this._format(updated);
  }

  async getRecords(query, requestedBy) {
    if (!this._isAdmin(requestedBy)) throw new ForbiddenError('Insufficient permissions');

    const result = await this.medicalRecordRepository.findAll({
      page: parseInt(query.page, 10) || DEFAULT_PAGE,
      limit: parseInt(query.limit, 10) || DEFAULT_LIMIT,
      patientProfileId: query.patientProfileId,
      recordType: query.recordType,
      search: query.search,
      sortBy: query.sortBy || 'createdAt',
      sortOrder: query.sortOrder || 'desc',
    });

    return {
      records: result.records.map((r) => this._format(r)),
      pagination: result.pagination,
    };
  }

  async getMyRecords(requestedBy, { recordType } = {}) {
    if (!requestedBy || requestedBy.role !== UserRole.PATIENT) {
      throw new ForbiddenError('Only patients can access this resource');
    }

    const profile = await this._resolvePatientProfileByUser(requestedBy.id);
    const records = await this.medicalRecordRepository.findByPatientProfileId(profile._id, {
      recordType,
    });
    return records.map((r) => this._format(r));
  }

  async getRecordsByPatientId(patientProfileId, requestedBy, { recordType } = {}) {
    await this._validatePatientAccess(patientProfileId, requestedBy);
    const records = await this.medicalRecordRepository.findByPatientProfileId(patientProfileId, {
      recordType,
    });
    return records.map((r) => this._format(r));
  }

  async getRecordsByConsultationId(consultationId, requestedBy) {
    const consultation = await this.consultationRepository.findById(consultationId);
    if (!consultation) throw new NotFoundError('Consultation not found');

    const patientProfileId =
      consultation.appointmentId?.patientProfileId?._id ||
      consultation.appointmentId?.patientProfileId;
    await this._validatePatientAccess(patientProfileId, requestedBy);

    const records = await this.medicalRecordRepository.findByConsultationId(consultationId);
    return records.map((r) => this._format(r));
  }

  async getRecordById(id, requestedBy) {
    const record = await this.medicalRecordRepository.findById(id);
    if (!record || !record.isActive) throw new NotFoundError('Medical record not found');
    if (!this._canAccessRecord(record, requestedBy)) throw new ForbiddenError('Insufficient permissions');
    return this._format(record);
  }

  async getRecordHistory(id, requestedBy) {
    const record = await this.medicalRecordRepository.findById(id);
    if (!record || !record.isActive) throw new NotFoundError('Medical record not found');
    if (!this._canAccessRecord(record, requestedBy)) throw new ForbiddenError('Insufficient permissions');

    const formatted = this._format(record);
    return {
      recordId: formatted.id,
      currentVersion: formatted.version,
      history: formatted.history ?? [],
    };
  }

  async downloadRecord(id, requestedBy, { version } = {}) {
    const record = await this.medicalRecordRepository.findById(id);
    if (!record || !record.isActive) throw new NotFoundError('Medical record not found');
    if (!this._canAccessRecord(record, requestedBy)) throw new ForbiddenError('Insufficient permissions');

    let storagePath = record.storagePath;
    let originalFileName = record.originalFileName;
    let mimeType = record.mimeType;

    if (version && version !== record.version) {
      const historical = (record.history ?? []).find((h) => h.version === version);
      if (!historical) throw new NotFoundError('Historical version not found');
      storagePath = historical.storagePath;
      originalFileName = historical.originalFileName;
      mimeType = historical.mimeType;
    }

    const buffer = await this.fileStorageService.readFile(storagePath);
    return { buffer, originalFileName, mimeType };
  }

  async updateRecordMetadata(id, data, requestedBy) {
    const record = await this.medicalRecordRepository.findById(id);
    if (!record || !record.isActive) throw new NotFoundError('Medical record not found');
    if (!this._canAccessRecord(record, requestedBy)) throw new ForbiddenError('Insufficient permissions');

    const payload = {};
    if (data.title !== undefined) payload.title = data.title;
    if (data.description !== undefined) payload.description = data.description;
    if (data.recordType !== undefined) payload.recordType = data.recordType;

    const updated = await this.medicalRecordRepository.updateById(id, payload);
    return this._format(updated);
  }

  async deleteRecord(id, requestedBy) {
    if (!this._isAdmin(requestedBy)) throw new ForbiddenError('Insufficient permissions');

    const record = await this.medicalRecordRepository.findById(id);
    if (!record) throw new NotFoundError('Medical record not found');

    await this.medicalRecordRepository.softDeleteById(id);
    return { message: 'Medical record removed successfully' };
  }
}

module.exports = MedicalRecordService;

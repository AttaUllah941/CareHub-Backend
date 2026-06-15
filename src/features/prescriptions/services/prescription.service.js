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
const { generatePrescriptionPdf } = require('./prescriptionPdf.service');

class PrescriptionService {
  constructor(
    prescriptionRepository,
    consultationRepository,
    patientProfileRepository,
    doctorProfileRepository,
    notificationService = null,
  ) {
    this.prescriptionRepository = prescriptionRepository;
    this.consultationRepository = consultationRepository;
    this.patientProfileRepository = patientProfileRepository;
    this.doctorProfileRepository = doctorProfileRepository;
    this.notificationService = notificationService;
  }

  _isAdmin(requestedBy) {
    return requestedBy && [UserRole.SUPER_ADMIN, UserRole.ADMIN].includes(requestedBy.role);
  }

  _format(prescription) {
    const json = prescription.toJSON ? prescription.toJSON() : prescription;
    const consultation = json.consultationId;
    const createdBy = json.createdByUserId;

    return {
      ...json,
      consultationId:
        consultation?.id || consultation?._id?.toString() || json.consultationId?.toString(),
      createdByUserId:
        createdBy?.id || createdBy?._id?.toString() || json.createdByUserId?.toString(),
      consultation:
        consultation && typeof consultation === 'object'
          ? this._formatConsultation(consultation)
          : undefined,
      createdBy:
        createdBy && typeof createdBy === 'object'
          ? {
              id: createdBy.id || createdBy._id?.toString(),
              firstName: createdBy.firstName,
              lastName: createdBy.lastName,
              email: createdBy.email,
            }
          : undefined,
    };
  }

  _formatConsultation(consultation) {
    const json = consultation.toJSON ? consultation.toJSON() : consultation;
    const appointment = json.appointmentId;

    return {
      ...json,
      id: json.id || json._id?.toString(),
      appointmentId: appointment?.id || appointment?._id?.toString() || json.appointmentId?.toString(),
      appointment:
        appointment && typeof appointment === 'object'
          ? {
              id: appointment.id || appointment._id?.toString(),
              appointmentDate: appointment.appointmentDate,
              startTime: appointment.startTime,
              endTime: appointment.endTime,
              status: appointment.status,
              patient: appointment.patientProfileId
                ? {
                    id: appointment.patientProfileId.id || appointment.patientProfileId._id?.toString(),
                    user: appointment.patientProfileId.userId,
                  }
                : undefined,
              doctor: appointment.doctorProfileId
                ? {
                    id: appointment.doctorProfileId.id || appointment.doctorProfileId._id?.toString(),
                    user: appointment.doctorProfileId.userId,
                    title: appointment.doctorProfileId.title,
                  }
                : undefined,
              clinic: appointment.clinicId
                ? {
                    id: appointment.clinicId.id || appointment.clinicId._id?.toString(),
                    name: appointment.clinicId.name,
                    city: appointment.clinicId.city,
                  }
                : undefined,
              familyMember: appointment.familyMemberId
                ? {
                    id: appointment.familyMemberId.id || appointment.familyMemberId._id?.toString(),
                    firstName: appointment.familyMemberId.firstName,
                    lastName: appointment.familyMemberId.lastName,
                    relationship: appointment.familyMemberId.relationship,
                  }
                : undefined,
            }
          : undefined,
    };
  }

  async _resolvePatientProfileByUser(userId) {
    const profile = await this.patientProfileRepository.findByUserId(userId);
    if (!profile) throw new NotFoundError('Patient profile not found');
    return profile;
  }

  async _resolveDoctorProfileByUser(userId) {
    const profile = await this.doctorProfileRepository.findByUserId(userId);
    if (!profile) throw new NotFoundError('Doctor profile not found');
    return profile;
  }

  _canAccessPrescription(prescription, requestedBy) {
    if (this._isAdmin(requestedBy)) return true;

    const consultation = prescription.consultationId;
    const appointment = consultation?.appointmentId;
    if (!appointment || typeof appointment !== 'object') return false;

    if (requestedBy?.role === UserRole.DOCTOR) {
      const doctorUserId =
        appointment.doctorProfileId?.userId?._id?.toString() ||
        appointment.doctorProfileId?.userId?.id ||
        appointment.doctorProfileId?.userId?.toString();
      return doctorUserId === requestedBy.id;
    }

    if (requestedBy?.role === UserRole.PATIENT) {
      const patientUserId =
        appointment.patientProfileId?.userId?._id?.toString() ||
        appointment.patientProfileId?.userId?.id ||
        appointment.patientProfileId?.userId?.toString();
      return patientUserId === requestedBy.id;
    }

    return false;
  }

  _validateMedicines(medicines) {
    if (!Array.isArray(medicines) || medicines.length === 0) {
      throw new BadRequestError('At least one medicine is required');
    }
    for (const med of medicines) {
      if (!med.name?.trim() || !med.dosage?.trim() || !med.duration?.trim()) {
        throw new BadRequestError('Each medicine requires name, dosage, and duration');
      }
    }
  }

  async getPrescriptions(query, requestedBy) {
    if (!this._isAdmin(requestedBy)) throw new ForbiddenError('Insufficient permissions');

    const result = await this.prescriptionRepository.findAll({
      page: parseInt(query.page, 10) || DEFAULT_PAGE,
      limit: parseInt(query.limit, 10) || DEFAULT_LIMIT,
      patientProfileId: query.patientProfileId,
      doctorProfileId: query.doctorProfileId,
      consultationId: query.consultationId,
      search: query.search,
      sortBy: query.sortBy || 'createdAt',
      sortOrder: query.sortOrder || 'desc',
    });

    return {
      prescriptions: result.prescriptions.map((p) => this._format(p)),
      pagination: result.pagination,
    };
  }

  async getMyPrescriptions(requestedBy) {
    if (!requestedBy || requestedBy.role !== UserRole.PATIENT) {
      throw new ForbiddenError('Only patients can access this resource');
    }

    const profile = await this._resolvePatientProfileByUser(requestedBy.id);
    const prescriptions = await this.prescriptionRepository.findByPatientProfileId(profile._id);
    return prescriptions.map((p) => this._format(p));
  }

  async getDoctorPrescriptions(requestedBy) {
    if (!requestedBy || requestedBy.role !== UserRole.DOCTOR) {
      throw new ForbiddenError('Only doctors can access this resource');
    }

    const profile = await this._resolveDoctorProfileByUser(requestedBy.id);
    const prescriptions = await this.prescriptionRepository.findByDoctorProfileId(profile._id);
    return prescriptions.map((p) => this._format(p));
  }

  async getPrescriptionByConsultationId(consultationId, requestedBy) {
    const consultation = await this.consultationRepository.findById(consultationId);
    if (!consultation || !consultation.isActive) throw new NotFoundError('Consultation not found');

    const prescription = await this.prescriptionRepository.findByConsultationId(consultationId);
    if (!prescription) throw new NotFoundError('Prescription not found');

    if (!this._canAccessPrescription(prescription, requestedBy)) {
      throw new ForbiddenError('Insufficient permissions');
    }

    return this._format(prescription);
  }

  async getPrescriptionById(id, requestedBy) {
    const prescription = await this.prescriptionRepository.findById(id);
    if (!prescription || !prescription.isActive) throw new NotFoundError('Prescription not found');

    if (!this._canAccessPrescription(prescription, requestedBy)) {
      throw new ForbiddenError('Insufficient permissions');
    }

    return this._format(prescription);
  }

  async createPrescription(consultationId, data, requestedBy) {
    if (!requestedBy || requestedBy.role !== UserRole.DOCTOR) {
      throw new ForbiddenError('Only doctors can create prescriptions');
    }

    const consultation = await this.consultationRepository.findById(consultationId);
    if (!consultation || !consultation.isActive) throw new NotFoundError('Consultation not found');

    const doctorProfile = await this._resolveDoctorProfileByUser(requestedBy.id);
    const appointment = consultation.appointmentId;
    const appointmentDoctorId =
      appointment?.doctorProfileId?._id?.toString() || appointment?.doctorProfileId?.toString();

    if (appointmentDoctorId !== doctorProfile._id.toString()) {
      throw new ForbiddenError('You can only prescribe for your own consultations');
    }

    const existing = await this.prescriptionRepository.findByConsultationId(consultationId);
    if (existing) throw new ConflictError('A prescription already exists for this consultation');

    this._validateMedicines(data.medicines);

    const prescription = await this.prescriptionRepository.create({
      consultationId,
      medicines: data.medicines,
      notes: data.notes,
      createdByUserId: requestedBy.id,
    });

    if (this.notificationService) {
      this.notificationService.notifyPrescriptionReady(prescription);
    }

    return this._format(prescription);
  }

  async updatePrescription(id, data, requestedBy) {
    const prescription = await this.prescriptionRepository.findById(id);
    if (!prescription || !prescription.isActive) throw new NotFoundError('Prescription not found');

    const isDoctor =
      requestedBy?.role === UserRole.DOCTOR && this._canAccessPrescription(prescription, requestedBy);
    const isAdmin = this._isAdmin(requestedBy);

    if (!isDoctor && !isAdmin) throw new ForbiddenError('Insufficient permissions');

    const payload = {};
    if (data.medicines !== undefined) {
      this._validateMedicines(data.medicines);
      payload.medicines = data.medicines;
    }
    if (data.notes !== undefined) payload.notes = data.notes;

    const updated = await this.prescriptionRepository.updateById(id, payload);
    return this._format(updated);
  }

  async deletePrescription(id, requestedBy) {
    if (!this._isAdmin(requestedBy)) throw new ForbiddenError('Insufficient permissions');

    const prescription = await this.prescriptionRepository.findById(id);
    if (!prescription) throw new NotFoundError('Prescription not found');

    await this.prescriptionRepository.softDeleteById(id);
    return { message: 'Prescription removed successfully' };
  }

  async generatePdf(id, requestedBy) {
    const prescription = await this.prescriptionRepository.findById(id);
    if (!prescription || !prescription.isActive) throw new NotFoundError('Prescription not found');

    if (!this._canAccessPrescription(prescription, requestedBy)) {
      throw new ForbiddenError('Insufficient permissions');
    }

    const buffer = await generatePrescriptionPdf(prescription);
    const filename = `prescription-${id}.pdf`;
    return { buffer, filename };
  }
}

module.exports = PrescriptionService;

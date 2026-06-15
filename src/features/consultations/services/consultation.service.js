const {
  ConflictError,
  NotFoundError,
  ForbiddenError,
  BadRequestError,
} = require('../../../core/errors/AppError');
const { UserRole } = require('../../../shared/enums/userRole.enum');
const { AppointmentStatus } = require('../../../shared/enums/appointmentStatus.enum');
const {
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
} = require('../../../shared/constants/pagination.constants');

const CONSULTATION_ELIGIBLE_STATUSES = [AppointmentStatus.CONFIRMED, AppointmentStatus.COMPLETED];

class ConsultationService {
  constructor(consultationRepository, appointmentRepository, patientProfileRepository, doctorProfileRepository) {
    this.consultationRepository = consultationRepository;
    this.appointmentRepository = appointmentRepository;
    this.patientProfileRepository = patientProfileRepository;
    this.doctorProfileRepository = doctorProfileRepository;
  }

  _isAdmin(requestedBy) {
    return requestedBy && [UserRole.SUPER_ADMIN, UserRole.ADMIN].includes(requestedBy.role);
  }

  _format(consultation) {
    const json = consultation.toJSON ? consultation.toJSON() : consultation;
    const appointment = json.appointmentId;
    const createdBy = json.createdByUserId;

    return {
      ...json,
      appointmentId:
        appointment?.id || appointment?._id?.toString() || json.appointmentId?.toString(),
      createdByUserId:
        createdBy?.id || createdBy?._id?.toString() || json.createdByUserId?.toString(),
      appointment:
        appointment && typeof appointment === 'object'
          ? this._formatAppointment(appointment)
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

  _formatAppointment(appointment) {
    const json = appointment.toJSON ? appointment.toJSON() : appointment;
    const patient = json.patientProfileId;
    const doctor = json.doctorProfileId;
    const clinic = json.clinicId;
    const familyMember = json.familyMemberId;

    return {
      ...json,
      id: json.id || json._id?.toString(),
      patientProfileId: patient?.id || patient?._id?.toString() || json.patientProfileId?.toString(),
      doctorProfileId: doctor?.id || doctor?._id?.toString() || json.doctorProfileId?.toString(),
      clinicId: clinic?.id || clinic?._id?.toString() || json.clinicId?.toString(),
      familyMemberId: familyMember
        ? familyMember.id || familyMember._id?.toString()
        : json.familyMemberId || null,
      patient:
        patient && typeof patient === 'object'
          ? {
              id: patient.id || patient._id?.toString(),
              user: patient.userId,
            }
          : undefined,
      doctor:
        doctor && typeof doctor === 'object'
          ? {
              id: doctor.id || doctor._id?.toString(),
              user: doctor.userId,
              title: doctor.title,
            }
          : undefined,
      clinic:
        clinic && typeof clinic === 'object'
          ? {
              id: clinic.id || clinic._id?.toString(),
              name: clinic.name,
              city: clinic.city,
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

  _canAccessConsultation(consultation, requestedBy) {
    if (this._isAdmin(requestedBy)) return true;

    const appointment = consultation.appointmentId;
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

  async _loadAppointmentForConsultation(appointmentId) {
    const appointment = await this.appointmentRepository.findById(appointmentId);
    if (!appointment || !appointment.isActive) throw new NotFoundError('Appointment not found');

    if (!CONSULTATION_ELIGIBLE_STATUSES.includes(appointment.status)) {
      throw new BadRequestError('Consultation can only be recorded for confirmed or completed appointments');
    }

    return appointment;
  }

  async getConsultations(query, requestedBy) {
    if (!this._isAdmin(requestedBy)) throw new ForbiddenError('Insufficient permissions');

    const result = await this.consultationRepository.findAll({
      page: parseInt(query.page, 10) || DEFAULT_PAGE,
      limit: parseInt(query.limit, 10) || DEFAULT_LIMIT,
      patientProfileId: query.patientProfileId,
      doctorProfileId: query.doctorProfileId,
      appointmentId: query.appointmentId,
      search: query.search,
      sortBy: query.sortBy || 'createdAt',
      sortOrder: query.sortOrder || 'desc',
    });

    return {
      consultations: result.consultations.map((c) => this._format(c)),
      pagination: result.pagination,
    };
  }

  async getMyConsultations(requestedBy) {
    if (!requestedBy || requestedBy.role !== UserRole.PATIENT) {
      throw new ForbiddenError('Only patients can access this resource');
    }

    const profile = await this._resolvePatientProfileByUser(requestedBy.id);
    const consultations = await this.consultationRepository.findByPatientProfileId(profile._id);
    return consultations.map((c) => this._format(c));
  }

  async getDoctorConsultations(requestedBy) {
    if (!requestedBy || requestedBy.role !== UserRole.DOCTOR) {
      throw new ForbiddenError('Only doctors can access this resource');
    }

    const profile = await this._resolveDoctorProfileByUser(requestedBy.id);
    const consultations = await this.consultationRepository.findByDoctorProfileId(profile._id);
    return consultations.map((c) => this._format(c));
  }

  async getConsultationByAppointmentId(appointmentId, requestedBy) {
    const appointment = await this.appointmentRepository.findById(appointmentId);
    if (!appointment) throw new NotFoundError('Appointment not found');

    const consultation = await this.consultationRepository.findByAppointmentId(appointmentId);
    if (!consultation) throw new NotFoundError('Consultation not found');

    if (!this._canAccessConsultation(consultation, requestedBy)) {
      throw new ForbiddenError('Insufficient permissions');
    }

    return this._format(consultation);
  }

  async getConsultationById(id, requestedBy) {
    const consultation = await this.consultationRepository.findById(id);
    if (!consultation || !consultation.isActive) throw new NotFoundError('Consultation not found');

    if (!this._canAccessConsultation(consultation, requestedBy)) {
      throw new ForbiddenError('Insufficient permissions');
    }

    return this._format(consultation);
  }

  async createConsultation(appointmentId, data, requestedBy) {
    if (!requestedBy || requestedBy.role !== UserRole.DOCTOR) {
      throw new ForbiddenError('Only doctors can create consultations');
    }

    const appointment = await this._loadAppointmentForConsultation(appointmentId);
    const doctorProfile = await this._resolveDoctorProfileByUser(requestedBy.id);

    const appointmentDoctorId =
      appointment.doctorProfileId?._id?.toString() || appointment.doctorProfileId?.toString();
    if (appointmentDoctorId !== doctorProfile._id.toString()) {
      throw new ForbiddenError('You can only record consultations for your own appointments');
    }

    const existing = await this.consultationRepository.findByAppointmentId(appointmentId);
    if (existing) throw new ConflictError('A consultation already exists for this appointment');

    const consultation = await this.consultationRepository.create({
      appointmentId,
      diagnosis: data.diagnosis,
      observations: data.observations,
      doctorNotes: data.doctorNotes,
      recommendations: data.recommendations,
      createdByUserId: requestedBy.id,
    });

    if (appointment.status === AppointmentStatus.CONFIRMED) {
      await this.appointmentRepository.updateById(appointmentId, {
        status: AppointmentStatus.COMPLETED,
      });
    }

    return this._format(consultation);
  }

  async updateConsultation(id, data, requestedBy) {
    const consultation = await this.consultationRepository.findById(id);
    if (!consultation || !consultation.isActive) throw new NotFoundError('Consultation not found');

    const isDoctor =
      requestedBy?.role === UserRole.DOCTOR && this._canAccessConsultation(consultation, requestedBy);
    const isAdmin = this._isAdmin(requestedBy);

    if (!isDoctor && !isAdmin) throw new ForbiddenError('Insufficient permissions');

    const payload = {};
    if (data.diagnosis !== undefined) payload.diagnosis = data.diagnosis;
    if (data.observations !== undefined) payload.observations = data.observations;
    if (data.doctorNotes !== undefined) payload.doctorNotes = data.doctorNotes;
    if (data.recommendations !== undefined) payload.recommendations = data.recommendations;

    const updated = await this.consultationRepository.updateById(id, payload);
    return this._format(updated);
  }

  async deleteConsultation(id, requestedBy) {
    if (!this._isAdmin(requestedBy)) throw new ForbiddenError('Insufficient permissions');

    const consultation = await this.consultationRepository.findById(id);
    if (!consultation) throw new NotFoundError('Consultation not found');

    await this.consultationRepository.softDeleteById(id);
    return { message: 'Consultation removed successfully' };
  }
}

module.exports = ConsultationService;

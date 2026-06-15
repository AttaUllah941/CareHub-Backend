const {
  ConflictError,
  NotFoundError,
  ForbiddenError,
  BadRequestError,
} = require('../../../core/errors/AppError');
const { UserRole } = require('../../../shared/enums/userRole.enum');
const {
  AppointmentStatus,
  CANCELLABLE_STATUSES,
  RESCHEDULABLE_STATUSES,
} = require('../../../shared/enums/appointmentStatus.enum');
const { DoctorVerificationStatus } = require('../../../shared/enums/doctorVerificationStatus.enum');
const {
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
} = require('../../../shared/constants/pagination.constants');
const { normalizeAppointmentDate } = require('../utils/appointmentSlot.util');

class AppointmentService {
  constructor(
    appointmentRepository,
    patientProfileRepository,
    doctorProfileRepository,
    clinicRepository,
    doctorAvailabilityRepository,
    familyMemberRepository,
    slotEngineService,
    notificationService = null,
  ) {
    this.appointmentRepository = appointmentRepository;
    this.patientProfileRepository = patientProfileRepository;
    this.doctorProfileRepository = doctorProfileRepository;
    this.clinicRepository = clinicRepository;
    this.doctorAvailabilityRepository = doctorAvailabilityRepository;
    this.familyMemberRepository = familyMemberRepository;
    this.slotEngineService = slotEngineService;
    this.notificationService = notificationService;
  }

  _isAdmin(requestedBy) {
    return requestedBy && [UserRole.SUPER_ADMIN, UserRole.ADMIN].includes(requestedBy.role);
  }

  _format(appointment) {
    const json = appointment.toJSON ? appointment.toJSON() : appointment;
    const patient = json.patientProfileId;
    const doctor = json.doctorProfileId;
    const clinic = json.clinicId;
    const familyMember = json.familyMemberId;
    const bookedBy = json.bookedByUserId;

    return {
      ...json,
      patientProfileId: patient?.id || patient?._id?.toString() || json.patientProfileId?.toString(),
      doctorProfileId: doctor?.id || doctor?._id?.toString() || json.doctorProfileId?.toString(),
      clinicId: clinic?.id || clinic?._id?.toString() || json.clinicId?.toString(),
      familyMemberId: familyMember
        ? familyMember.id || familyMember._id?.toString()
        : json.familyMemberId || null,
      bookedByUserId: bookedBy?.id || bookedBy?._id?.toString() || json.bookedByUserId?.toString(),
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
              specialties: doctor.specialtyIds,
            }
          : undefined,
      clinic:
        clinic && typeof clinic === 'object'
          ? {
              id: clinic.id || clinic._id?.toString(),
              name: clinic.name,
              city: clinic.city,
              address: clinic.address,
              phone: clinic.phone,
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
      bookedBy:
        bookedBy && typeof bookedBy === 'object'
          ? {
              id: bookedBy.id || bookedBy._id?.toString(),
              firstName: bookedBy.firstName,
              lastName: bookedBy.lastName,
            }
          : undefined,
    };
  }

  async _resolvePatientProfileByUser(userId) {
    const profile = await this.patientProfileRepository.findByUserId(userId);
    if (!profile) throw new NotFoundError('Patient profile not found. Complete your profile first.');
    return profile;
  }

  async _resolveDoctorProfileByUser(userId) {
    const profile = await this.doctorProfileRepository.findByUserId(userId);
    if (!profile) throw new NotFoundError('Doctor profile not found');
    return profile;
  }

  _canAccessAppointment(appointment, requestedBy) {
    if (this._isAdmin(requestedBy)) return true;

    if (requestedBy?.role === UserRole.DOCTOR) {
      const doctorUserId =
        appointment.doctorProfileId?.userId?._id?.toString() ||
        appointment.doctorProfileId?.userId?.id ||
        appointment.doctorProfileId?.userId?.toString();
      const profileUserId =
        appointment.doctorProfileId?.userId?._id?.toString() ||
        appointment.doctorProfileId?.userId?.toString();
      const doctorProfileId =
        appointment.doctorProfileId?._id?.toString() || appointment.doctorProfileId?.toString();

      if (doctorUserId === requestedBy.id || profileUserId === requestedBy.id) return true;

      return requestedBy.doctorProfileId === doctorProfileId;
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

  async _validateBookingEntities({ doctorProfileId, clinicId, familyMemberId, patientProfileId }) {
    const [doctor, clinic] = await Promise.all([
      this.doctorProfileRepository.findById(doctorProfileId),
      this.clinicRepository.findById(clinicId),
    ]);

    if (!doctor || !doctor.isActive) throw new NotFoundError('Doctor not found');
    if (doctor.verificationStatus !== DoctorVerificationStatus.VERIFIED) {
      throw new BadRequestError('Doctor is not verified');
    }
    if (!clinic || !clinic.isActive) throw new NotFoundError('Clinic not found');

    const doctorIdStr = doctor._id.toString();
    const assigned = (clinic.doctorProfileIds ?? []).some((id) => id.toString() === doctorIdStr);
    if (!assigned) throw new BadRequestError('Doctor is not assigned to this clinic');

    if (familyMemberId) {
      const member = await this.familyMemberRepository.findById(familyMemberId);
      if (!member || !member.isActive) throw new NotFoundError('Family member not found');
      const memberPatientId = member.patientProfileId?._id?.toString() || member.patientProfileId?.toString();
      if (memberPatientId !== patientProfileId.toString()) {
        throw new BadRequestError('Family member does not belong to this patient');
      }
    }

    return { doctor, clinic };
  }

  async _validateSlot({ doctorProfileId, appointmentDate, startTime, clinicId, excludeId = null }) {
    return this.slotEngineService.validateAndResolveSlot({
      doctorProfileId,
      appointmentDate,
      startTime,
      clinicId,
      excludeId,
    });
  }

  async getAvailableSlots(doctorProfileId, date, requestedBy, { clinicId = null } = {}) {
    if (
      !requestedBy ||
      ![UserRole.PATIENT, UserRole.DOCTOR, UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.CLINIC_MANAGER].includes(
        requestedBy.role,
      )
    ) {
      throw new ForbiddenError('Insufficient permissions');
    }

    const doctor = await this.doctorProfileRepository.findById(doctorProfileId);
    if (!doctor || !doctor.isActive) throw new NotFoundError('Doctor not found');

    const result = await this.slotEngineService.getSlotsForDate(doctorProfileId, date, { clinicId });

    return {
      date: result.date,
      slots: result.slots,
      slotDurationMinutes: result.slotDurationMinutes,
      totalGenerated: result.totalGenerated,
      bookedCount: result.bookedCount,
    };
  }

  async getRecurringSlots(doctorProfileId, fromDate, toDate, requestedBy, { clinicId = null, maxDays } = {}) {
    if (
      !requestedBy ||
      ![UserRole.PATIENT, UserRole.DOCTOR, UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.CLINIC_MANAGER].includes(
        requestedBy.role,
      )
    ) {
      throw new ForbiddenError('Insufficient permissions');
    }

    const doctor = await this.doctorProfileRepository.findById(doctorProfileId);
    if (!doctor || !doctor.isActive) throw new NotFoundError('Doctor not found');

    return this.slotEngineService.getRecurringSlots(doctorProfileId, fromDate, toDate, {
      clinicId,
      maxDays,
    });
  }

  async getAppointments(query, requestedBy) {
    if (!this._isAdmin(requestedBy)) throw new ForbiddenError('Insufficient permissions');

    const result = await this.appointmentRepository.findAll({
      page: parseInt(query.page, 10) || DEFAULT_PAGE,
      limit: parseInt(query.limit, 10) || DEFAULT_LIMIT,
      patientProfileId: query.patientProfileId,
      doctorProfileId: query.doctorProfileId,
      clinicId: query.clinicId,
      status: query.status,
      fromDate: query.fromDate ? normalizeAppointmentDate(query.fromDate) : undefined,
      toDate: query.toDate ? normalizeAppointmentDate(query.toDate) : undefined,
      search: query.search,
      sortBy: query.sortBy || 'appointmentDate',
      sortOrder: query.sortOrder || 'desc',
    });

    return {
      appointments: result.appointments.map((a) => this._format(a)),
      pagination: result.pagination,
    };
  }

  async getMyAppointments(requestedBy, query = {}) {
    if (!requestedBy || requestedBy.role !== UserRole.PATIENT) {
      throw new ForbiddenError('Only patients can access this resource');
    }

    const profile = await this._resolvePatientProfileByUser(requestedBy.id);
    const appointments = await this.appointmentRepository.findByPatientProfileId(profile._id, {
      status: query.status,
    });
    return appointments.map((a) => this._format(a));
  }

  async getDoctorAppointments(requestedBy, query = {}) {
    if (!requestedBy || requestedBy.role !== UserRole.DOCTOR) {
      throw new ForbiddenError('Only doctors can access this resource');
    }

    const profile = await this._resolveDoctorProfileByUser(requestedBy.id);
    const appointments = await this.appointmentRepository.findByDoctorProfileId(profile._id, {
      status: query.status,
    });
    return appointments.map((a) => this._format(a));
  }

  async getAppointmentById(id, requestedBy) {
    const appointment = await this.appointmentRepository.findById(id);
    if (!appointment) throw new NotFoundError('Appointment not found');

    if (!this._canAccessAppointment(appointment, requestedBy)) {
      throw new ForbiddenError('Insufficient permissions');
    }

    return this._format(appointment);
  }

  async bookAppointment(data, requestedBy) {
    if (!requestedBy || requestedBy.role !== UserRole.PATIENT) {
      throw new ForbiddenError('Only patients can book appointments');
    }

    const profile = await this._resolvePatientProfileByUser(requestedBy.id);
    const { doctor, clinic } = await this._validateBookingEntities({
      doctorProfileId: data.doctorProfileId,
      clinicId: data.clinicId,
      familyMemberId: data.familyMemberId,
      patientProfileId: profile._id,
    });

    const slot = await this._validateSlot({
      doctorProfileId: data.doctorProfileId,
      appointmentDate: data.appointmentDate,
      startTime: data.startTime,
      clinicId: data.clinicId,
    });

    const appointment = await this.appointmentRepository.create({
      patientProfileId: profile._id,
      familyMemberId: data.familyMemberId || null,
      doctorProfileId: data.doctorProfileId,
      clinicId: data.clinicId,
      appointmentDate: slot.appointmentDate,
      startTime: slot.startTime,
      endTime: slot.endTime,
      slotDurationMinutes: slot.slotDurationMinutes,
      reason: data.reason,
      consultationFee: doctor.consultationFee,
      currency: doctor.currency || 'USD',
      bookedByUserId: requestedBy.id,
      status: AppointmentStatus.PENDING,
    });

    if (this.notificationService) {
      this.notificationService.notifyAppointmentBooked(appointment);
    }

    return this._format(appointment);
  }

  async updateAppointment(id, data, requestedBy) {
    const appointment = await this.appointmentRepository.findById(id);
    if (!appointment) throw new NotFoundError('Appointment not found');

    if (!this._canAccessAppointment(appointment, requestedBy)) {
      throw new ForbiddenError('Insufficient permissions');
    }

    const isPatient = requestedBy?.role === UserRole.PATIENT;
    const isAdmin = this._isAdmin(requestedBy);

    if (isPatient) {
      if (![AppointmentStatus.PENDING].includes(appointment.status)) {
        throw new BadRequestError('Only pending appointments can be updated');
      }
      const updated = await this.appointmentRepository.updateById(id, {
        reason: data.reason,
        notes: data.notes,
      });
      return this._format(updated);
    }

    if (!isAdmin && requestedBy?.role !== UserRole.DOCTOR) {
      throw new ForbiddenError('Insufficient permissions');
    }

    const payload = {};
    if (data.reason !== undefined) payload.reason = data.reason;
    if (data.notes !== undefined) payload.notes = data.notes;

    const updated = await this.appointmentRepository.updateById(id, payload);
    return this._format(updated);
  }

  async cancelAppointment(id, data, requestedBy) {
    const appointment = await this.appointmentRepository.findById(id);
    if (!appointment) throw new NotFoundError('Appointment not found');

    if (!this._canAccessAppointment(appointment, requestedBy)) {
      throw new ForbiddenError('Insufficient permissions');
    }

    if (!CANCELLABLE_STATUSES.includes(appointment.status)) {
      throw new BadRequestError('This appointment cannot be cancelled');
    }

    const updated = await this.appointmentRepository.updateById(id, {
      status: AppointmentStatus.CANCELLED,
      cancellationReason: data.cancellationReason,
      cancelledBy: requestedBy.id,
      cancelledAt: new Date(),
    });

    if (this.notificationService) {
      this.notificationService.notifyAppointmentCancelled(updated);
    }

    return this._format(updated);
  }

  async rescheduleAppointment(id, data, requestedBy) {
    const appointment = await this.appointmentRepository.findById(id);
    if (!appointment) throw new NotFoundError('Appointment not found');

    if (!this._canAccessAppointment(appointment, requestedBy)) {
      throw new ForbiddenError('Insufficient permissions');
    }

    if (!RESCHEDULABLE_STATUSES.includes(appointment.status)) {
      throw new BadRequestError('This appointment cannot be rescheduled');
    }

    const slot = await this._validateSlot({
      doctorProfileId: appointment.doctorProfileId._id || appointment.doctorProfileId,
      appointmentDate: data.appointmentDate,
      startTime: data.startTime,
      clinicId: appointment.clinicId._id || appointment.clinicId,
      excludeId: id,
    });

    const updated = await this.appointmentRepository.updateById(id, {
      appointmentDate: slot.appointmentDate,
      startTime: slot.startTime,
      endTime: slot.endTime,
      slotDurationMinutes: slot.slotDurationMinutes,
      status: AppointmentStatus.PENDING,
      cancellationReason: undefined,
      cancelledBy: undefined,
      cancelledAt: undefined,
    });

    if (this.notificationService) {
      this.notificationService.notifyAppointmentRescheduled(updated);
    }

    return this._format(updated);
  }

  async updateAppointmentStatus(id, data, requestedBy) {
    const appointment = await this.appointmentRepository.findById(id);
    if (!appointment) throw new NotFoundError('Appointment not found');

    const isDoctor =
      requestedBy?.role === UserRole.DOCTOR &&
      this._canAccessAppointment(appointment, requestedBy);
    const isAdmin = this._isAdmin(requestedBy);

    if (!isDoctor && !isAdmin) {
      throw new ForbiddenError('Insufficient permissions');
    }

    const allowedTransitions = {
      [AppointmentStatus.PENDING]: [AppointmentStatus.CONFIRMED, AppointmentStatus.CANCELLED],
      [AppointmentStatus.CONFIRMED]: [
        AppointmentStatus.COMPLETED,
        AppointmentStatus.CANCELLED,
        AppointmentStatus.NO_SHOW,
      ],
    };

    const allowed = allowedTransitions[appointment.status] ?? [];
    if (!allowed.includes(data.status) && !isAdmin) {
      throw new BadRequestError(`Cannot change status from ${appointment.status} to ${data.status}`);
    }

    const payload = { status: data.status };
    if (data.notes !== undefined) payload.notes = data.notes;
    if (data.status === AppointmentStatus.CANCELLED) {
      payload.cancellationReason = data.cancellationReason || 'Cancelled by provider';
      payload.cancelledBy = requestedBy.id;
      payload.cancelledAt = new Date();
    }

    const updated = await this.appointmentRepository.updateById(id, payload);

    if (this.notificationService) {
      if (data.status === AppointmentStatus.CONFIRMED) {
        this.notificationService.notifyAppointmentConfirmed(updated);
      } else if (data.status === AppointmentStatus.CANCELLED) {
        this.notificationService.notifyAppointmentCancelled(updated);
      }
    }

    return this._format(updated);
  }
}

module.exports = AppointmentService;

const {
  ConflictError,
  NotFoundError,
  ForbiddenError,
  BadRequestError,
} = require('../../../core/errors/AppError');
const { UserRole } = require('../../../shared/enums/userRole.enum');
const { AppointmentStatus } = require('../../../shared/enums/appointmentStatus.enum');
const { ReviewStatus } = require('../../../shared/enums/reviewStatus.enum');
const {
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
} = require('../../../shared/constants/pagination.constants');

class ReviewService {
  constructor(
    reviewRepository,
    appointmentRepository,
    consultationRepository,
    patientProfileRepository,
    doctorProfileRepository,
  ) {
    this.reviewRepository = reviewRepository;
    this.appointmentRepository = appointmentRepository;
    this.consultationRepository = consultationRepository;
    this.patientProfileRepository = patientProfileRepository;
    this.doctorProfileRepository = doctorProfileRepository;
  }

  _isAdmin(requestedBy) {
    return requestedBy && [UserRole.SUPER_ADMIN, UserRole.ADMIN].includes(requestedBy.role);
  }

  _formatUser(user) {
    if (!user || typeof user !== 'object') return undefined;
    return {
      id: user.id || user._id?.toString(),
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
    };
  }

  _formatAppointment(appointment) {
    if (!appointment || typeof appointment !== 'object') return undefined;
    const json = appointment.toJSON ? appointment.toJSON() : appointment;
    return {
      id: json.id || json._id?.toString(),
      appointmentDate: json.appointmentDate,
      startTime: json.startTime,
      endTime: json.endTime,
      status: json.status,
      patient: json.patientProfileId
        ? {
            id: json.patientProfileId.id || json.patientProfileId._id?.toString(),
            user: this._formatUser(json.patientProfileId.userId),
          }
        : undefined,
      doctor: json.doctorProfileId
        ? {
            id: json.doctorProfileId.id || json.doctorProfileId._id?.toString(),
            user: this._formatUser(json.doctorProfileId.userId),
            title: json.doctorProfileId.title,
          }
        : undefined,
      clinic: json.clinicId
        ? {
            id: json.clinicId.id || json.clinicId._id?.toString(),
            name: json.clinicId.name,
            city: json.clinicId.city,
          }
        : undefined,
      familyMember: json.familyMemberId
        ? {
            id: json.familyMemberId.id || json.familyMemberId._id?.toString(),
            firstName: json.familyMemberId.firstName,
            lastName: json.familyMemberId.lastName,
            relationship: json.familyMemberId.relationship,
          }
        : undefined,
    };
  }

  _format(review) {
    const json = review.toJSON ? review.toJSON() : review;
    const appointment = json.appointmentId;

    return {
      ...json,
      appointmentId:
        appointment?.id || appointment?._id?.toString() || json.appointmentId?.toString(),
      consultationId:
        json.consultationId?.id ||
        json.consultationId?._id?.toString() ||
        json.consultationId?.toString() ||
        null,
      doctorProfileId:
        json.doctorProfileId?.id ||
        json.doctorProfileId?._id?.toString() ||
        json.doctorProfileId?.toString(),
      patientProfileId:
        json.patientProfileId?.id ||
        json.patientProfileId?._id?.toString() ||
        json.patientProfileId?.toString(),
      clinicId: json.clinicId?.id || json.clinicId?._id?.toString() || json.clinicId?.toString(),
      createdByUserId:
        json.createdByUserId?.id ||
        json.createdByUserId?._id?.toString() ||
        json.createdByUserId?.toString(),
      moderatedByUserId:
        json.moderatedByUserId?.id ||
        json.moderatedByUserId?._id?.toString() ||
        json.moderatedByUserId?.toString() ||
        null,
      appointment:
        appointment && typeof appointment === 'object'
          ? this._formatAppointment(appointment)
          : undefined,
      doctor:
        json.doctorProfileId && typeof json.doctorProfileId === 'object'
          ? {
              id: json.doctorProfileId.id || json.doctorProfileId._id?.toString(),
              title: json.doctorProfileId.title,
              user: this._formatUser(json.doctorProfileId.userId),
            }
          : undefined,
      patient:
        json.patientProfileId && typeof json.patientProfileId === 'object'
          ? {
              id: json.patientProfileId.id || json.patientProfileId._id?.toString(),
              user: this._formatUser(json.patientProfileId.userId),
            }
          : undefined,
      clinic:
        json.clinicId && typeof json.clinicId === 'object'
          ? {
              id: json.clinicId.id || json.clinicId._id?.toString(),
              name: json.clinicId.name,
              city: json.clinicId.city,
            }
          : undefined,
      createdBy: this._formatUser(json.createdByUserId),
      moderatedBy: this._formatUser(json.moderatedByUserId),
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

  _canAccessReview(review, requestedBy) {
    if (this._isAdmin(requestedBy)) return true;

    if (requestedBy?.role === UserRole.DOCTOR) {
      const doctorUserId =
        review.doctorProfileId?.userId?._id?.toString() ||
        review.doctorProfileId?.userId?.id ||
        review.doctorProfileId?.userId?.toString();
      return doctorUserId === requestedBy.id;
    }

    if (requestedBy?.role === UserRole.PATIENT) {
      const patientUserId =
        review.patientProfileId?.userId?._id?.toString() ||
        review.patientProfileId?.userId?.id ||
        review.patientProfileId?.userId?.toString();
      return patientUserId === requestedBy.id;
    }

    return false;
  }

  _isReviewOwner(review, requestedBy) {
    const createdBy =
      review.createdByUserId?._id?.toString() ||
      review.createdByUserId?.id ||
      review.createdByUserId?.toString();
    return createdBy === requestedBy?.id;
  }

  async getReviews(query, requestedBy) {
    if (!this._isAdmin(requestedBy)) throw new ForbiddenError('Insufficient permissions');

    const result = await this.reviewRepository.findAll({
      page: parseInt(query.page, 10) || DEFAULT_PAGE,
      limit: parseInt(query.limit, 10) || DEFAULT_LIMIT,
      patientProfileId: query.patientProfileId,
      doctorProfileId: query.doctorProfileId,
      clinicId: query.clinicId,
      status: query.status,
      rating: query.rating,
      search: query.search,
      sortBy: query.sortBy || 'createdAt',
      sortOrder: query.sortOrder || 'desc',
    });

    return {
      reviews: result.reviews.map((r) => this._format(r)),
      pagination: result.pagination,
    };
  }

  async getMyReviews(requestedBy) {
    if (!requestedBy || requestedBy.role !== UserRole.PATIENT) {
      throw new ForbiddenError('Only patients can access this resource');
    }

    const profile = await this._resolvePatientProfileByUser(requestedBy.id);
    const reviews = await this.reviewRepository.findByPatientProfileId(profile._id, {
      includeHidden: true,
    });
    return reviews.map((r) => this._format(r));
  }

  async getDoctorReviews(requestedBy) {
    if (!requestedBy || requestedBy.role !== UserRole.DOCTOR) {
      throw new ForbiddenError('Only doctors can access this resource');
    }

    const profile = await this._resolveDoctorProfileByUser(requestedBy.id);
    const reviews = await this.reviewRepository.findByDoctorProfileId(profile._id, {
      includeHidden: true,
    });
    return reviews.map((r) => this._format(r));
  }

  async getReviewsByDoctorProfileId(doctorProfileId, requestedBy) {
    const doctor = await this.doctorProfileRepository.findById(doctorProfileId);
    if (!doctor || !doctor.isActive) throw new NotFoundError('Doctor not found');

    const includeHidden = this._isAdmin(requestedBy);
    const reviews = await this.reviewRepository.findByDoctorProfileId(doctorProfileId, {
      includeHidden,
    });
    const stats = await this.reviewRepository.getDoctorRatingStats(doctorProfileId);

    return {
      reviews: reviews.map((r) => this._format(r)),
      stats,
    };
  }

  async getDoctorStats(doctorProfileId) {
    const doctor = await this.doctorProfileRepository.findById(doctorProfileId);
    if (!doctor || !doctor.isActive) throw new NotFoundError('Doctor not found');
    return this.reviewRepository.getDoctorRatingStats(doctorProfileId);
  }

  async getReviewByAppointmentId(appointmentId, requestedBy) {
    const review = await this.reviewRepository.findByAppointmentId(appointmentId);
    if (!review) throw new NotFoundError('Review not found');

    if (!this._canAccessReview(review, requestedBy)) {
      throw new ForbiddenError('Insufficient permissions');
    }

    return this._format(review);
  }

  async getReviewById(id, requestedBy) {
    const review = await this.reviewRepository.findById(id);
    if (!review || !review.isActive) throw new NotFoundError('Review not found');

    if (!this._canAccessReview(review, requestedBy)) {
      if (review.status !== ReviewStatus.PUBLISHED) {
        throw new ForbiddenError('Insufficient permissions');
      }
    }

    return this._format(review);
  }

  async createReview(appointmentId, data, requestedBy) {
    if (!requestedBy || requestedBy.role !== UserRole.PATIENT) {
      throw new ForbiddenError('Only patients can submit reviews');
    }

    const appointment = await this.appointmentRepository.findById(appointmentId);
    if (!appointment || !appointment.isActive) throw new NotFoundError('Appointment not found');

    if (appointment.status !== AppointmentStatus.COMPLETED) {
      throw new BadRequestError('Reviews can only be submitted for completed appointments');
    }

    const patientProfile = await this._resolvePatientProfileByUser(requestedBy.id);
    const appointmentPatientId =
      appointment.patientProfileId?._id?.toString() || appointment.patientProfileId?.toString();

    if (appointmentPatientId !== patientProfile._id.toString()) {
      throw new ForbiddenError('You can only review your own appointments');
    }

    const existing = await this.reviewRepository.findByAppointmentId(appointmentId);
    if (existing) throw new ConflictError('A review already exists for this appointment');

    const consultation = await this.consultationRepository.findByAppointmentId(appointmentId);

    const review = await this.reviewRepository.create({
      appointmentId,
      consultationId: consultation?._id || null,
      doctorProfileId: appointment.doctorProfileId?._id || appointment.doctorProfileId,
      patientProfileId: appointment.patientProfileId?._id || appointment.patientProfileId,
      clinicId: appointment.clinicId?._id || appointment.clinicId,
      rating: data.rating,
      title: data.title,
      comment: data.comment,
      createdByUserId: requestedBy.id,
    });

    return this._format(review);
  }

  async updateReview(id, data, requestedBy) {
    const review = await this.reviewRepository.findById(id);
    if (!review || !review.isActive) throw new NotFoundError('Review not found');

    const isOwner = this._isReviewOwner(review, requestedBy);
    const isAdmin = this._isAdmin(requestedBy);

    if (!isOwner && !isAdmin) throw new ForbiddenError('Insufficient permissions');

    if (isOwner && !isAdmin && requestedBy.role !== UserRole.PATIENT) {
      throw new ForbiddenError('Only the review author can edit this review');
    }

    const payload = {};
    if (data.rating !== undefined) payload.rating = data.rating;
    if (data.title !== undefined) payload.title = data.title;
    if (data.comment !== undefined) payload.comment = data.comment;

    if (isAdmin && data.status !== undefined) {
      payload.status = data.status;
      payload.moderatedByUserId = requestedBy.id;
      payload.moderatedAt = new Date();
      if (data.moderationNote !== undefined) payload.moderationNote = data.moderationNote;
    }

    const updated = await this.reviewRepository.updateById(id, payload);
    return this._format(updated);
  }

  async moderateReview(id, data, requestedBy) {
    if (!this._isAdmin(requestedBy)) throw new ForbiddenError('Insufficient permissions');

    const review = await this.reviewRepository.findById(id);
    if (!review || !review.isActive) throw new NotFoundError('Review not found');

    const updated = await this.reviewRepository.updateById(id, {
      status: data.status,
      moderationNote: data.moderationNote,
      moderatedByUserId: requestedBy.id,
      moderatedAt: new Date(),
    });

    return this._format(updated);
  }

  async deleteReview(id, requestedBy) {
    if (!this._isAdmin(requestedBy)) throw new ForbiddenError('Insufficient permissions');

    const review = await this.reviewRepository.findById(id);
    if (!review) throw new NotFoundError('Review not found');

    await this.reviewRepository.softDeleteById(id);
    return { message: 'Review removed successfully' };
  }
}

module.exports = ReviewService;

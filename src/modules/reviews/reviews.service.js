const {
  ForbiddenError,
  NotFoundError,
  ConflictError,
  BadRequestError,
} = require('../../core/errors/AppError');
const { UserRole } = require('../../shared/enums/userRole.enum');
const { parsePaginationQuery, buildPaginationMeta } = require('../../core/utils/pagination.util');
const doctorsRepository = require('../doctors/doctors.repository');
const appointmentsRepository = require('../appointments/appointments.repository');
const { User } = require('../users/users.model');
const reviewsRepository = require('./reviews.repository');

const SORT_FIELDS = ['date', 'createdAt', 'rating'];

const toPatientInitials = (name) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '??';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const toReviewResponse = (review) => ({
  id: review._id.toString(),
  doctorId: review.doctorId.toString(),
  patientId: review.patientId.toString(),
  patientName: review.patientName,
  patientInitials: toPatientInitials(review.patientName),
  rating: review.rating,
  headline: review.headline,
  body: review.body,
  tags: review.tags,
  date: review.date,
  createdAt: review.createdAt?.toISOString(),
  updatedAt: review.updatedAt?.toISOString(),
});

const toPublicReviewResponse = (review) => ({
  id: review._id.toString(),
  patientName: review.patientName,
  patientInitials: toPatientInitials(review.patientName),
  rating: review.rating,
  headline: review.headline,
  body: review.body,
  tags: review.tags,
  date: review.date,
});

const isAdmin = (user) =>
  user?.role === UserRole.ADMIN || user?.role === UserRole.SUPER_ADMIN;

const assertOwner = (review, user) => {
  if (review.patientId.toString() !== user.id) {
    throw new ForbiddenError('You do not have permission to modify this review');
  }
};

const assertCanDelete = (review, user) => {
  if (isAdmin(user) || review.patientId.toString() === user.id) {
    return;
  }
  throw new ForbiddenError('You do not have permission to delete this review');
};

const formatReviewDate = (value = new Date()) => {
  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString().slice(0, 10);
};

const recalculateDoctorRating = async (doctorId) => {
  const stats = await reviewsRepository.aggregateDoctorStats(doctorId);
  await doctorsRepository.updateRatingStats(doctorId, stats);
  return stats;
};

const getDoctorOrThrow = async (doctorId) => {
  if (!doctorsRepository.isValidObjectId(doctorId)) {
    throw new NotFoundError('Doctor not found');
  }

  const doctor = await doctorsRepository.findById(doctorId);
  if (!doctor) {
    throw new NotFoundError('Doctor not found');
  }

  return doctor;
};

const listDoctorReviews = async (doctorId, query) => {
  await getDoctorOrThrow(doctorId);

  const { page, limit, skip, sort } = parsePaginationQuery(query, SORT_FIELDS);

  const [reviews, total] = await Promise.all([
    reviewsRepository.findByDoctor(doctorId, { skip, limit, sort }),
    reviewsRepository.countByDoctor(doctorId),
  ]);

  return {
    reviews: reviews.map(toPublicReviewResponse),
    pagination: buildPaginationMeta(page, limit, total),
  };
};

const createReview = async (doctorId, payload, user) => {
  const doctor = await getDoctorOrThrow(doctorId);

  const eligible = await appointmentsRepository.hasCompletedAppointment(user.id, doctor._id);
  if (!eligible) {
    throw new BadRequestError(
      'You can only review a doctor after completing an appointment with them',
    );
  }

  const patient = await User.findById(user.id).select('firstName lastName');
  if (!patient) {
    throw new NotFoundError('User not found');
  }

  const patientName = `${patient.firstName} ${patient.lastName}`.trim();
  const reviewDate = formatReviewDate();

  try {
    const review = await reviewsRepository.create({
      doctorId: doctor._id,
      patientId: user.id,
      patientName,
      rating: payload.rating,
      headline: payload.headline,
      body: payload.body,
      tags: payload.tags ?? [],
      date: reviewDate,
    });

    const stats = await recalculateDoctorRating(doctor._id);

    return {
      review: toReviewResponse(review),
      doctorRating: stats,
    };
  } catch (error) {
    if (error.code === 11000) {
      throw new ConflictError('You have already reviewed this doctor');
    }
    throw error;
  }
};

const updateReview = async (id, payload, user) => {
  if (!reviewsRepository.isValidObjectId(id)) {
    throw new NotFoundError('Review not found');
  }

  const review = await reviewsRepository.findById(id);
  if (!review) {
    throw new NotFoundError('Review not found');
  }

  assertOwner(review, user);

  const updated = await reviewsRepository.updateById(id, {
    rating: payload.rating,
    headline: payload.headline,
    body: payload.body,
    tags: payload.tags ?? [],
  });

  const stats = await recalculateDoctorRating(review.doctorId);

  return {
    review: toReviewResponse(updated),
    doctorRating: stats,
  };
};

const deleteReview = async (id, user) => {
  if (!reviewsRepository.isValidObjectId(id)) {
    throw new NotFoundError('Review not found');
  }

  const review = await reviewsRepository.findById(id);
  if (!review) {
    throw new NotFoundError('Review not found');
  }

  assertCanDelete(review, user);

  const doctorId = review.doctorId;
  await reviewsRepository.deleteById(id);

  const stats = await recalculateDoctorRating(doctorId);

  return { doctorRating: stats };
};

module.exports = {
  listDoctorReviews,
  createReview,
  updateReview,
  deleteReview,
  toReviewResponse,
  toPublicReviewResponse,
  recalculateDoctorRating,
};

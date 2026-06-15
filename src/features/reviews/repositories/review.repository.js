const Review = require('../models/review.model');
const mongoose = require('mongoose');

const APPOINTMENT_POPULATE = [
  {
    path: 'patientProfileId',
    select: 'userId gender city',
    populate: { path: 'userId', select: 'firstName lastName email phone' },
  },
  {
    path: 'doctorProfileId',
    select: 'userId title specialtyIds',
    populate: { path: 'userId', select: 'firstName lastName email phone' },
  },
  { path: 'clinicId', select: 'name city address phone' },
  { path: 'familyMemberId', select: 'firstName lastName relationship' },
];

const POPULATE_FIELDS = [
  { path: 'appointmentId', populate: APPOINTMENT_POPULATE },
  { path: 'consultationId', select: 'diagnosis createdAt' },
  {
    path: 'doctorProfileId',
    select: 'userId title specialtyIds',
    populate: { path: 'userId', select: 'firstName lastName email' },
  },
  {
    path: 'patientProfileId',
    select: 'userId gender city',
    populate: { path: 'userId', select: 'firstName lastName email' },
  },
  { path: 'clinicId', select: 'name city address' },
  { path: 'createdByUserId', select: 'firstName lastName email' },
  { path: 'moderatedByUserId', select: 'firstName lastName email' },
];

class ReviewRepository {
  async create(data) {
    const review = await Review.create(data);
    return review.populate(POPULATE_FIELDS);
  }

  async findById(id) {
    return Review.findById(id).populate(POPULATE_FIELDS);
  }

  async findByAppointmentId(appointmentId) {
    return Review.findOne({ appointmentId, isActive: true }).populate(POPULATE_FIELDS);
  }

  async updateById(id, data) {
    return Review.findByIdAndUpdate(id, data, { new: true, runValidators: true }).populate(
      POPULATE_FIELDS,
    );
  }

  async softDeleteById(id) {
    return Review.findByIdAndUpdate(id, { isActive: false }, { new: true }).populate(
      POPULATE_FIELDS,
    );
  }

  async findByPatientProfileId(patientProfileId, { includeHidden = false } = {}) {
    const filter = { patientProfileId, isActive: true };
    if (!includeHidden) filter.status = 'PUBLISHED';
    return Review.find(filter).sort({ createdAt: -1 }).populate(POPULATE_FIELDS);
  }

  async findByDoctorProfileId(doctorProfileId, { includeHidden = false } = {}) {
    const filter = { doctorProfileId, isActive: true };
    if (!includeHidden) filter.status = 'PUBLISHED';
    return Review.find(filter).sort({ createdAt: -1 }).populate(POPULATE_FIELDS);
  }

  async getDoctorRatingStats(doctorProfileId) {
    const result = await Review.aggregate([
      {
        $match: {
          doctorProfileId: new mongoose.Types.ObjectId(doctorProfileId),
          isActive: true,
          status: 'PUBLISHED',
        },
      },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 },
          rating1: { $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] } },
          rating2: { $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] } },
          rating3: { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
          rating4: { $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] } },
          rating5: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } },
        },
      },
    ]);

    if (!result.length) {
      return { averageRating: 0, totalReviews: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } };
    }

    const row = result[0];
    return {
      averageRating: Math.round(row.averageRating * 10) / 10,
      totalReviews: row.totalReviews,
      distribution: {
        1: row.rating1,
        2: row.rating2,
        3: row.rating3,
        4: row.rating4,
        5: row.rating5,
      },
    };
  }

  async findAll({
    page = 1,
    limit = 10,
    patientProfileId,
    doctorProfileId,
    clinicId,
    status,
    rating,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  }) {
    const filter = { isActive: true };
    if (patientProfileId) filter.patientProfileId = patientProfileId;
    if (doctorProfileId) filter.doctorProfileId = doctorProfileId;
    if (clinicId) filter.clinicId = clinicId;
    if (status) filter.status = status;
    if (rating) filter.rating = parseInt(rating, 10);

    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      filter.$or = [{ title: regex }, { comment: regex }];
    }

    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const [reviews, total] = await Promise.all([
      Review.find(filter).sort(sort).skip(skip).limit(limit).populate(POPULATE_FIELDS),
      Review.countDocuments(filter),
    ]);

    return {
      reviews,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  }
}

module.exports = ReviewRepository;

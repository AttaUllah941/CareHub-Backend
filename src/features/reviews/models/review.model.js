const mongoose = require('mongoose');
const { REVIEW_STATUS_VALUES, ReviewStatus } = require('../../../shared/enums/reviewStatus.enum');

const reviewSchema = new mongoose.Schema(
  {
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      required: true,
      unique: true,
      index: true,
    },
    consultationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Consultation',
      default: null,
      index: true,
    },
    doctorProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DoctorProfile',
      required: true,
      index: true,
    },
    patientProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PatientProfile',
      required: true,
      index: true,
    },
    clinicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Clinic',
      required: true,
      index: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      index: true,
    },
    title: { type: String, trim: true, maxlength: 150 },
    comment: { type: String, trim: true, maxlength: 2000 },
    status: {
      type: String,
      enum: REVIEW_STATUS_VALUES,
      default: ReviewStatus.PUBLISHED,
      index: true,
    },
    moderationNote: { type: String, trim: true, maxlength: 500 },
    moderatedByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    moderatedAt: { type: Date, default: null },
    createdByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    isActive: { type: Boolean, default: true, index: true },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  },
);

reviewSchema.index({ doctorProfileId: 1, createdAt: -1 });
reviewSchema.index({ patientProfileId: 1, createdAt: -1 });

module.exports = mongoose.model('Review', reviewSchema);

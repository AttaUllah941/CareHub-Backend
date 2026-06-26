const mongoose = require('mongoose');

const VERIFICATION_STATUSES = ['PENDING', 'VERIFIED', 'REJECTED'];
const GENDERS = ['MALE', 'FEMALE', 'OTHER'];

const qualificationSchema = new mongoose.Schema(
  {
    degree: { type: String, required: true, trim: true },
    institute: { type: String, required: true, trim: true },
    year: { type: Number },
  },
  { _id: false },
);

const workHistorySchema = new mongoose.Schema(
  {
    position: { type: String, required: true, trim: true },
    organization: { type: String, required: true, trim: true },
    from: { type: Number },
    to: { type: Number },
  },
  { _id: false },
);

const doctorSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    title: {
      type: String,
      trim: true,
      default: 'Dr.',
    },
    gender: {
      type: String,
      enum: GENDERS,
    },
    dateOfBirth: {
      type: Date,
    },
    city: {
      type: String,
      trim: true,
      index: true,
    },
    bio: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    about: {
      type: String,
      trim: true,
      maxlength: 5000,
    },
    yearsOfExperience: {
      type: Number,
      min: 0,
      default: 0,
    },
    licenseNumber: {
      type: String,
      trim: true,
    },
    licenseAuthority: {
      type: String,
      trim: true,
    },
    medicalRegistrationNumber: {
      type: String,
      trim: true,
    },
    qualifications: {
      type: [qualificationSchema],
      default: [],
    },
    workHistory: {
      type: [workHistorySchema],
      default: [],
    },
    specialtyIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MedicalSpecialty',
      },
    ],
    languageIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Language',
      },
    ],
    consultationFee: {
      type: Number,
      min: 0,
    },
    currency: {
      type: String,
      default: 'PKR',
      trim: true,
    },
    verificationStatus: {
      type: String,
      enum: VERIFICATION_STATUSES,
      default: 'PENDING',
      index: true,
    },
    rejectionReason: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    profileImageUrl: {
      type: String,
      trim: true,
    },
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    reviewCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  },
);

doctorSchema.index({ userId: 1 }, { unique: true });
doctorSchema.index({ specialtyIds: 1 });
doctorSchema.index({ fullName: 'text', firstName: 'text', lastName: 'text' });

const Doctor = mongoose.models.Doctor || mongoose.model('Doctor', doctorSchema);

module.exports = { Doctor, VERIFICATION_STATUSES, GENDERS };

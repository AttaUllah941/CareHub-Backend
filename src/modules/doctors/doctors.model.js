const mongoose = require('mongoose');

const GENDERS = ['MALE', 'FEMALE', 'OTHER'];
const VERIFICATION_STATUSES = ['PENDING', 'VERIFIED', 'REJECTED'];

const qualificationSchema = new mongoose.Schema(
  {
    degree: { type: String, trim: true, default: '' },
    institute: { type: String, trim: true, default: '' },
    year: { type: Number },
  },
  { _id: false },
);

const workHistorySchema = new mongoose.Schema(
  {
    organization: { type: String, trim: true, default: '' },
    position: { type: String, trim: true, default: '' },
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
      unique: true,
    },
    fullName: { type: String, required: true, trim: true },
    gender: { type: String, enum: GENDERS, default: 'MALE' },
    city: { type: String, trim: true, default: '' },
    country: { type: String, trim: true, default: 'Pakistan' },
    title: { type: String, trim: true, default: '' },
    bio: { type: String, trim: true, default: '' },
    about: { type: String, trim: true, default: '' },
    dateOfBirth: { type: Date },
    specialtyIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Specialty' }],
    languageIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Language' }],
    qualifications: { type: [qualificationSchema], default: [] },
    workHistory: { type: [workHistorySchema], default: [] },
    yearsOfExperience: { type: Number, min: 0, default: 0 },
    consultationFee: { type: Number, min: 0, default: 0 },
    currency: { type: String, trim: true, default: 'PKR' },
    profileImageUrl: { type: String, trim: true, default: '' },
    licenseNumber: { type: String, trim: true, default: '' },
    licenseAuthority: { type: String, trim: true, default: '' },
    medicalRegistrationNumber: { type: String, trim: true, default: '' },
    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0, min: 0 },
    verificationStatus: {
      type: String,
      enum: VERIFICATION_STATUSES,
      default: 'PENDING',
    },
    rejectionReason: { type: String, trim: true, default: '' },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

doctorSchema.index({ verificationStatus: 1, isActive: 1, city: 1 });
doctorSchema.index({ specialtyIds: 1 });
doctorSchema.index({ yearsOfExperience: -1 });
doctorSchema.index({ consultationFee: 1 });

const Doctor = mongoose.models.Doctor || mongoose.model('Doctor', doctorSchema);

module.exports = { Doctor, GENDERS, VERIFICATION_STATUSES };

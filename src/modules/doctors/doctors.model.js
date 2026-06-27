const mongoose = require('mongoose');

const GENDERS = ['male', 'female', 'other'];
const VERIFICATION_STATUSES = ['PENDING', 'VERIFIED', 'REJECTED'];

const qualificationSchema = new mongoose.Schema(
  {
    degree: { type: String, trim: true },
    institute: { type: String, trim: true },
    year: { type: Number },
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
    city: { type: String, trim: true, default: '' },
    title: { type: String, trim: true, default: '' },
    gender: { type: String, enum: GENDERS },
    bio: { type: String, trim: true, default: '' },
    about: { type: String, trim: true, default: '' },
    yearsOfExperience: { type: Number, min: 0, default: 0 },
    consultationFee: { type: Number, min: 0, default: 0 },
    currency: { type: String, trim: true, default: 'PKR' },
    qualifications: { type: [qualificationSchema], default: [] },
    specialtyIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Specialty' }],
    languageIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Language' }],
    profileImageUrl: { type: String, trim: true },
    licenseNumber: { type: String, trim: true },
    licenseAuthority: { type: String, trim: true },
    medicalRegistrationNumber: { type: String, trim: true },
    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0, min: 0 },
    verificationStatus: {
      type: String,
      enum: VERIFICATION_STATUSES,
      default: 'PENDING',
    },
    rejectionReason: { type: String, trim: true, default: '' },
  },
  { timestamps: true },
);

const Doctor = mongoose.models.Doctor || mongoose.model('Doctor', doctorSchema);

module.exports = { Doctor, GENDERS, VERIFICATION_STATUSES };

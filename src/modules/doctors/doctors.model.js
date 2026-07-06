const mongoose = require('mongoose');

const qualificationSchema = new mongoose.Schema(
  {
    degree: { type: String, trim: true, required: true },
    institution: { type: String, trim: true, default: '' },
    year: { type: Number },
    certificateUrl: { type: String, trim: true, default: '' },
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
    gender: { type: String, enum: ['MALE', 'FEMALE', 'OTHER'], default: 'MALE' },
    city: { type: String, trim: true, default: '' },
    country: { type: String, trim: true, default: 'Pakistan' },
    title: { type: String, trim: true, default: '' },
    about: { type: String, trim: true, default: '' },
    yearsOfExperience: { type: Number, default: 0, min: 0 },
    consultationFee: { type: Number, default: 0, min: 0 },
    currency: { type: String, trim: true, default: 'PKR' },
    profileImageUrl: { type: String, trim: true, default: '' },
    specialtyIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Specialty' }],
    languageIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Language' }],
    qualifications: { type: [qualificationSchema], default: [] },
    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0, min: 0 },
    verificationStatus: {
      type: String,
      enum: ['PENDING', 'VERIFIED', 'REJECTED'],
      default: 'PENDING',
    },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

doctorSchema.index({ verificationStatus: 1, isActive: 1, city: 1 });
doctorSchema.index({ specialtyIds: 1 });
doctorSchema.index({ yearsOfExperience: -1 });
doctorSchema.index({ consultationFee: 1 });

const Doctor = mongoose.models.Doctor || mongoose.model('Doctor', doctorSchema);

module.exports = { Doctor };

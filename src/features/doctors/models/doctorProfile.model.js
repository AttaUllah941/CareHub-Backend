const mongoose = require('mongoose');
const { DoctorVerificationStatus } = require('../../../shared/enums/doctorVerificationStatus.enum');

const qualificationSchema = new mongoose.Schema(
  {
    degree: { type: String, required: true, trim: true, maxlength: 150 },
    institution: { type: String, required: true, trim: true, maxlength: 200 },
    year: { type: Number, min: 1950, max: 2100 },
    certificateUrl: { type: String, trim: true },
  },
  { _id: true },
);

const workHistorySchema = new mongoose.Schema(
  {
    organization: { type: String, required: true, trim: true, maxlength: 200 },
    position: { type: String, required: true, trim: true, maxlength: 150 },
    startYear: { type: Number, min: 1950, max: 2100 },
    endYear: { type: Number, min: 1950, max: 2100 },
    isCurrent: { type: Boolean, default: false },
  },
  { _id: true },
);

/**
 * Doctor profile — extended professional data linked 1:1 to User.
 */
const doctorProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    // Personal Information
    gender: {
      type: String,
      enum: ['MALE', 'FEMALE', 'OTHER'],
      trim: true,
    },
    dateOfBirth: { type: Date },
    address: { type: String, trim: true, maxlength: 300 },
    city: { type: String, trim: true, maxlength: 100 },
    country: { type: String, trim: true, maxlength: 100 },
    bio: { type: String, trim: true, maxlength: 1000 },
    // Professional Information
    title: { type: String, trim: true, maxlength: 50 },
    licenseNumber: { type: String, trim: true, maxlength: 100, index: true },
    licenseAuthority: { type: String, trim: true, maxlength: 150 },
    medicalRegistrationNumber: { type: String, trim: true, maxlength: 100 },
    about: { type: String, trim: true, maxlength: 2000 },
    // Experience
    yearsOfExperience: { type: Number, min: 0, max: 70 },
    experienceSummary: { type: String, trim: true, maxlength: 2000 },
    workHistory: [workHistorySchema],
    // Specializations & Qualifications
    specialtyIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Specialty' }],
    qualifications: [qualificationSchema],
    languageIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Language' }],
    // Consultation
    consultationFee: { type: Number, min: 0 },
    currency: { type: String, trim: true, default: 'USD', maxlength: 10 },
    // Verification & media
    verificationStatus: {
      type: String,
      enum: Object.values(DoctorVerificationStatus),
      default: DoctorVerificationStatus.PENDING,
      index: true,
    },
    verificationNotes: { type: String, trim: true, maxlength: 500 },
    profileImageUrl: { type: String, trim: true },
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

doctorProfileSchema.index({ verificationStatus: 1, isActive: 1 });
doctorProfileSchema.index({ specialtyIds: 1 });
doctorProfileSchema.index({ languageIds: 1 });
doctorProfileSchema.index({ city: 1 });
doctorProfileSchema.index({ gender: 1, yearsOfExperience: 1, consultationFee: 1 });

const DoctorProfile = mongoose.model('DoctorProfile', doctorProfileSchema);

module.exports = DoctorProfile;

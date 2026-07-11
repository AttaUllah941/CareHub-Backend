const mongoose = require('mongoose');

const APPLICATION_STATUSES = ['pending', 'approved', 'rejected'];

const documentSchema = new mongoose.Schema(
  {
    type: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
    mimeType: { type: String, required: true, trim: true },
    size: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const qualificationSchema = new mongoose.Schema(
  {
    degree: { type: String, trim: true, default: '' },
    institution: { type: String, trim: true, default: '' },
    year: { type: Number },
  },
  { _id: false },
);

const availabilitySlotSchema = new mongoose.Schema(
  {
    day: { type: Number, min: 0, max: 6, required: true },
    startTime: { type: String, required: true, trim: true },
    endTime: { type: String, required: true, trim: true },
  },
  { _id: false },
);

const applicationProfileSchema = new mongoose.Schema(
  {
    specialtySlug: { type: String, trim: true, default: '' },
    specialtyName: { type: String, trim: true, default: '' },
    yearsOfExperience: { type: Number, min: 0, default: 0 },
    qualifications: { type: [qualificationSchema], default: [] },
    clinicName: { type: String, trim: true, default: '' },
    clinicAddress: { type: String, trim: true, default: '' },
    clinicCity: { type: String, trim: true, default: '' },
    clinicPhone: { type: String, trim: true, default: '' },
    consultationFee: { type: Number, min: 0, default: 0 },
    videoConsultationFee: { type: Number, min: 0 },
    availability: { type: [availabilitySlotSchema], default: [] },
  },
  { _id: false },
);

const doctorApplicationSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    phone: { type: String, required: true, trim: true },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      required: true,
      unique: true,
    },
    documents: {
      type: [documentSchema],
      required: true,
      validate: {
        validator: (docs) => Array.isArray(docs) && docs.length > 0,
        message: 'At least one document is required',
      },
    },
    profile: {
      type: applicationProfileSchema,
      default: () => ({}),
    },
    status: {
      type: String,
      enum: APPLICATION_STATUSES,
      default: 'pending',
      index: true,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    rejectionReason: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'doctor_applications',
  },
);

doctorApplicationSchema.index({ status: 1, createdAt: -1 });

const DoctorApplication =
  mongoose.models.DoctorApplication ||
  mongoose.model('DoctorApplication', doctorApplicationSchema);

module.exports = {
  DoctorApplication,
  APPLICATION_STATUSES,
};

const mongoose = require('mongoose');
const { BLOOD_GROUPS } = require('../../../shared/enums/bloodGroup.enum');
const { ALLERGY_SEVERITIES } = require('../../../shared/enums/allergySeverity.enum');

const allergySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 150 },
    severity: { type: String, enum: ALLERGY_SEVERITIES, default: 'MILD' },
    reaction: { type: String, trim: true, maxlength: 300 },
  },
  { _id: true },
);

const medicalInformationSchema = new mongoose.Schema(
  {
    chronicConditions: [{ type: String, trim: true, maxlength: 200 }],
    currentMedications: [{ type: String, trim: true, maxlength: 200 }],
    pastSurgeries: [{ type: String, trim: true, maxlength: 200 }],
    notes: { type: String, trim: true, maxlength: 2000 },
  },
  { _id: false },
);

const emergencyContactSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, maxlength: 100 },
    relationship: { type: String, trim: true, maxlength: 50 },
    phone: { type: String, trim: true, maxlength: 30 },
    email: { type: String, trim: true, lowercase: true, maxlength: 150 },
    address: { type: String, trim: true, maxlength: 300 },
  },
  { _id: false },
);

const patientProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    gender: { type: String, enum: ['MALE', 'FEMALE', 'OTHER'], trim: true },
    dateOfBirth: { type: Date },
    address: { type: String, trim: true, maxlength: 300 },
    city: { type: String, trim: true, maxlength: 100 },
    country: { type: String, trim: true, maxlength: 100 },
    bloodGroup: { type: String, enum: BLOOD_GROUPS, index: true },
    allergies: { type: [allergySchema], default: [] },
    medicalInformation: { type: medicalInformationSchema, default: () => ({}) },
    emergencyContact: { type: emergencyContactSchema, default: () => ({}) },
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

patientProfileSchema.index({ bloodGroup: 1, isActive: 1 });

const PatientProfile = mongoose.model('PatientProfile', patientProfileSchema);

module.exports = PatientProfile;

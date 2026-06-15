const mongoose = require('mongoose');
const { MEDICAL_RECORD_TYPES } = require('../../../shared/enums/medicalRecordType.enum');

const historySchema = new mongoose.Schema(
  {
    version: { type: Number, required: true },
    fileName: { type: String, required: true },
    originalFileName: { type: String, required: true },
    mimeType: { type: String, required: true },
    fileSize: { type: Number, required: true },
    storagePath: { type: String, required: true },
    uploadedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    changeNote: { type: String, trim: true, maxlength: 500 },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const medicalRecordSchema = new mongoose.Schema(
  {
    patientProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PatientProfile',
      required: true,
      index: true,
    },
    familyMemberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FamilyMember',
      default: null,
    },
    consultationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Consultation',
      default: null,
      index: true,
    },
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      default: null,
      index: true,
    },
    recordType: { type: String, enum: MEDICAL_RECORD_TYPES, required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 2000 },
    fileName: { type: String, required: true },
    originalFileName: { type: String, required: true },
    mimeType: { type: String, required: true },
    fileSize: { type: Number, required: true, min: 1 },
    storagePath: { type: String, required: true },
    version: { type: Number, default: 1, min: 1 },
    history: { type: [historySchema], default: [] },
    uploadedByUserId: {
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
        delete ret.storagePath;
        if (ret.history) {
          ret.history = ret.history.map((h) => {
            const entry = { ...h };
            entry.id = entry._id?.toString();
            delete entry._id;
            delete entry.storagePath;
            return entry;
          });
        }
        return ret;
      },
    },
  },
);

module.exports = mongoose.model('MedicalRecord', medicalRecordSchema);

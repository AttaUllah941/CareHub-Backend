const mongoose = require('mongoose');
const { PRESCRIPTION_UPLOAD_STATUS_VALUES } = require('../../../shared/enums/prescriptionUploadStatus.enum');

const prescriptionUploadSchema = new mongoose.Schema(
  {
    patientProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PatientProfile',
      required: true,
      index: true,
    },
    prescriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Prescription', default: null },
    title: { type: String, trim: true, maxlength: 200, default: 'Prescription Upload' },
    fileName: { type: String, required: true, trim: true },
    originalFileName: { type: String, required: true, trim: true },
    mimeType: { type: String, required: true, trim: true },
    fileSize: { type: Number, required: true, min: 0 },
    storagePath: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: PRESCRIPTION_UPLOAD_STATUS_VALUES,
      default: 'PENDING',
      index: true,
    },
    reviewNotes: { type: String, trim: true, maxlength: 1000 },
    reviewedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedAt: { type: Date, default: null },
    uploadedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
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
        return ret;
      },
    },
  },
);

module.exports = mongoose.model('PrescriptionUpload', prescriptionUploadSchema);

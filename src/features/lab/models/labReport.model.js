const mongoose = require('mongoose');
const { LAB_REPORT_STATUS_VALUES } = require('../../../shared/enums/labReportStatus.enum');

const labReportSchema = new mongoose.Schema(
  {
    labBookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'LabBooking', default: null },
    patientProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PatientProfile',
      required: true,
      index: true,
    },
    labId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lab', required: true, index: true },
    title: { type: String, trim: true, maxlength: 200, default: 'Lab Report' },
    fileName: { type: String, required: true, trim: true },
    originalFileName: { type: String, required: true, trim: true },
    mimeType: { type: String, required: true, trim: true },
    fileSize: { type: Number, required: true, min: 0 },
    storagePath: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: LAB_REPORT_STATUS_VALUES,
      default: 'AVAILABLE',
      index: true,
    },
    notes: { type: String, trim: true, maxlength: 1000 },
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

module.exports = mongoose.model('LabReport', labReportSchema);

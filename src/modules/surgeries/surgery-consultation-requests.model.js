const mongoose = require('mongoose');

const CONSULTATION_STATUSES = ['pending', 'contacted', 'scheduled', 'closed'];

const patientSnapshotSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true, default: '' },
    notes: { type: String, trim: true, maxlength: 2000, default: '' },
  },
  { _id: false },
);

const surgeryConsultationRequestSchema = new mongoose.Schema(
  {
    procedureId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SurgeryProcedure',
      required: true,
      index: true,
    },
    hospitalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hospital',
      required: true,
      index: true,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    patientSnapshot: {
      type: patientSnapshotSchema,
      required: true,
    },
    status: {
      type: String,
      enum: CONSULTATION_STATUSES,
      default: 'pending',
      index: true,
    },
  },
  { timestamps: true },
);

surgeryConsultationRequestSchema.index({ patientId: 1, status: 1, createdAt: -1 });
surgeryConsultationRequestSchema.index({ status: 1, createdAt: -1 });

const SurgeryConsultationRequest =
  mongoose.models.SurgeryConsultationRequest ||
  mongoose.model('SurgeryConsultationRequest', surgeryConsultationRequestSchema);

module.exports = {
  SurgeryConsultationRequest,
  CONSULTATION_STATUSES,
};

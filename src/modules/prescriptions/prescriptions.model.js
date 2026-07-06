const mongoose = require('mongoose');

const medicineItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    dosage: { type: String, trim: true, default: '' },
    duration: { type: String, trim: true, default: '' },
  },
  { _id: false },
);

const prescriptionSchema = new mongoose.Schema(
  {
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      required: true,
      index: true,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    patientName: { type: String, required: true, trim: true },
    diagnosis: { type: String, required: true, trim: true },
    medicines: {
      type: [medicineItemSchema],
      validate: [(value) => Array.isArray(value) && value.length > 0, 'At least one medicine is required'],
    },
    notes: { type: String, trim: true, default: '' },
  },
  { timestamps: true },
);

prescriptionSchema.index({ doctorId: 1, createdAt: -1 });
prescriptionSchema.index({ patientId: 1, createdAt: -1 });

const Prescription =
  mongoose.models.Prescription || mongoose.model('Prescription', prescriptionSchema);

module.exports = { Prescription };

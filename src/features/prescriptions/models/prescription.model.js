const mongoose = require('mongoose');

const medicineSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    dosage: { type: String, required: true, trim: true, maxlength: 200 },
    duration: { type: String, required: true, trim: true, maxlength: 100 },
    instructions: { type: String, trim: true, maxlength: 1000 },
  },
  { _id: true },
);

const prescriptionSchema = new mongoose.Schema(
  {
    consultationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Consultation',
      required: true,
      unique: true,
      index: true,
    },
    medicines: {
      type: [medicineSchema],
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: 'At least one medicine is required',
      },
    },
    notes: { type: String, trim: true, maxlength: 2000 },
    createdByUserId: {
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
        if (ret.medicines) {
          ret.medicines = ret.medicines.map((m) => ({
            ...m,
            id: m._id?.toString(),
            _id: undefined,
          }));
        }
        return ret;
      },
    },
  },
);

module.exports = mongoose.model('Prescription', prescriptionSchema);

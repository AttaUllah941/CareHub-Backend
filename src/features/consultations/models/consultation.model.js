const mongoose = require('mongoose');

const consultationSchema = new mongoose.Schema(
  {
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      required: true,
      unique: true,
      index: true,
    },
    diagnosis: { type: String, trim: true, maxlength: 2000 },
    observations: { type: String, trim: true, maxlength: 5000 },
    doctorNotes: { type: String, trim: true, maxlength: 5000 },
    recommendations: { type: String, trim: true, maxlength: 5000 },
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
        return ret;
      },
    },
  },
);

module.exports = mongoose.model('Consultation', consultationSchema);

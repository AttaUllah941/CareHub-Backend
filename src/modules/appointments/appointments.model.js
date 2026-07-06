const mongoose = require('mongoose');
const { generateBookingRef } = require('../../shared/utils/bookingRef.util');

const APPOINTMENT_STATUSES = ['pending', 'confirmed', 'completed', 'cancelled', 'rejected'];
const CONSULTATION_TYPES = ['video', 'clinic'];

const appointmentSchema = new mongoose.Schema(
  {
    bookingRef: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      index: true,
    },
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
    scheduledAt: {
      type: Date,
      required: true,
      index: true,
    },
    patientName: { type: String, trim: true, default: '' },
    patientEmail: { type: String, trim: true, lowercase: true, default: '' },
    patientPhone: { type: String, trim: true, default: '' },
    consultationType: {
      type: String,
      enum: CONSULTATION_TYPES,
      default: 'video',
      index: true,
    },
    status: {
      type: String,
      enum: APPOINTMENT_STATUSES,
      default: 'pending',
      index: true,
    },
  },
  { timestamps: true },
);

appointmentSchema.index({ patientId: 1, doctorId: 1, status: 1 });

appointmentSchema.pre('save', function assignBookingRef(next) {
  if (!this.bookingRef) {
    this.bookingRef = generateBookingRef();
  }
  next();
});

const Appointment =
  mongoose.models.Appointment || mongoose.model('Appointment', appointmentSchema);

module.exports = { Appointment, APPOINTMENT_STATUSES, CONSULTATION_TYPES };

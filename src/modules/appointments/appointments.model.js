const mongoose = require('mongoose');

const APPOINTMENT_STATUSES = ['pending', 'confirmed', 'completed', 'cancelled', 'rejected'];

const BLOCKING_APPOINTMENT_STATUSES = ['pending', 'confirmed', 'completed'];

const CONSULTATION_TYPES = ['clinic', 'video'];

const GENDERS = ['MALE', 'FEMALE', 'OTHER', ''];

const patientSnapshotSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    age: { type: Number, min: 0, max: 120 },
    gender: { type: String, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    notes: { type: String, trim: true, maxlength: 2000 },
  },
  { _id: false },
);

const appointmentSchema = new mongoose.Schema(
  {
    bookingRef: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
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
    clinicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Clinic',
      default: null,
    },
    consultationType: {
      type: String,
      enum: CONSULTATION_TYPES,
      required: true,
    },
    date: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
      index: true,
    },
    timeSlot: {
      type: String,
      required: true,
      trim: true,
    },
    city: {
      type: String,
      required: true,
      trim: true,
    },
    patientSnapshot: {
      type: patientSnapshotSchema,
      required: true,
    },
    status: {
      type: String,
      enum: APPOINTMENT_STATUSES,
      default: 'pending',
      index: true,
    },
    fee: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'PKR',
      trim: true,
    },
    confirmedAt: {
      type: Date,
    },
    rejectionReason: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
  },
  {
    timestamps: true,
  },
);

appointmentSchema.index(
  { doctorId: 1, date: 1, timeSlot: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: BLOCKING_APPOINTMENT_STATUSES },
    },
  },
);

appointmentSchema.index({ patientId: 1, status: 1, date: -1 });
appointmentSchema.index({ doctorId: 1, status: 1, date: -1 });

const Appointment =
  mongoose.models.Appointment || mongoose.model('Appointment', appointmentSchema);

module.exports = {
  Appointment,
  APPOINTMENT_STATUSES,
  BLOCKING_APPOINTMENT_STATUSES,
  CONSULTATION_TYPES,
};

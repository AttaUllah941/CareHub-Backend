const mongoose = require('mongoose');

const CONSULTATION_TYPES = ['clinic', 'video'];

const doctorScheduleSchema = new mongoose.Schema(
  {
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      required: true,
      index: true,
    },
    clinicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Clinic',
      default: null,
    },
    dayOfWeek: {
      type: Number,
      min: 0,
      max: 6,
    },
    specificDate: {
      type: String,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },
    startTime: {
      type: String,
      required: true,
      match: /^([01]\d|2[0-3]):[0-5]\d$/,
    },
    endTime: {
      type: String,
      required: true,
      match: /^([01]\d|2[0-3]):[0-5]\d$/,
    },
    slotDurationMinutes: {
      type: Number,
      required: true,
      min: 5,
      max: 240,
      default: 30,
    },
    consultationType: {
      type: String,
      enum: CONSULTATION_TYPES,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

doctorScheduleSchema.index({ doctorId: 1, dayOfWeek: 1 });
doctorScheduleSchema.index({ doctorId: 1, specificDate: 1 });

const DoctorSchedule =
  mongoose.models.DoctorSchedule || mongoose.model('DoctorSchedule', doctorScheduleSchema);

module.exports = { DoctorSchedule, CONSULTATION_TYPES };

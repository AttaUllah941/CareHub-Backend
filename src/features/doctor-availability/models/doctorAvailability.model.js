const mongoose = require('mongoose');

const breakSchema = new mongoose.Schema(
  {
    startTime: { type: String, required: true, trim: true },
    endTime: { type: String, required: true, trim: true },
  },
  { _id: true },
);

const dayScheduleSchema = new mongoose.Schema(
  {
    dayOfWeek: { type: Number, required: true, min: 0, max: 6 },
    isAvailable: { type: Boolean, default: false },
    startTime: { type: String, default: '09:00', trim: true },
    endTime: { type: String, default: '17:00', trim: true },
    breaks: [breakSchema],
  },
  { _id: false },
);

const vacationSchema = new mongoose.Schema(
  {
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    reason: { type: String, trim: true, maxlength: 255 },
  },
  { _id: true },
);

/**
 * Doctor availability — weekly schedule, slot duration, breaks, vacations.
 */
const doctorAvailabilitySchema = new mongoose.Schema(
  {
    doctorProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DoctorProfile',
      required: true,
      unique: true,
      index: true,
    },
    slotDurationMinutes: {
      type: Number,
      required: true,
      default: 30,
      min: 5,
      max: 240,
    },
    weeklySchedule: {
      type: [dayScheduleSchema],
      default: [],
    },
    vacationDates: {
      type: [vacationSchema],
      default: [],
    },
    timezone: {
      type: String,
      default: 'UTC',
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  },
);

const DoctorAvailability = mongoose.model('DoctorAvailability', doctorAvailabilitySchema);

module.exports = DoctorAvailability;

const mongoose = require('mongoose');

const breakSchema = new mongoose.Schema(
  {
    startTime: { type: String, required: true, trim: true },
    endTime: { type: String, required: true, trim: true },
  },
  { _id: false },
);

const workingHoursSchema = new mongoose.Schema(
  {
    dayOfWeek: { type: Number, required: true, min: 0, max: 6 },
    isOpen: { type: Boolean, default: false },
    openTime: { type: String, default: '09:00', trim: true },
    closeTime: { type: String, default: '17:00', trim: true },
    breaks: { type: [breakSchema], default: [] },
  },
  { _id: false },
);

const locationSchema = new mongoose.Schema(
  {
    latitude: { type: Number, min: -90, max: 90 },
    longitude: { type: Number, min: -180, max: 180 },
  },
  { _id: false },
);

const clinicSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 150, index: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    description: { type: String, trim: true, maxlength: 2000 },
    phone: { type: String, trim: true, maxlength: 30 },
    email: { type: String, trim: true, lowercase: true, maxlength: 150 },
    address: { type: String, trim: true, maxlength: 300 },
    city: { type: String, trim: true, maxlength: 100, index: true },
    state: { type: String, trim: true, maxlength: 100 },
    country: { type: String, trim: true, maxlength: 100, index: true },
    postalCode: { type: String, trim: true, maxlength: 20 },
    location: { type: locationSchema, default: () => ({}) },
    workingHours: { type: [workingHoursSchema], default: [] },
    doctorProfileIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'DoctorProfile' }],
    managerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      sparse: true,
      index: true,
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

clinicSchema.index({ 'location.latitude': 1, 'location.longitude': 1 });
clinicSchema.index({ isActive: 1, city: 1 });

const Clinic = mongoose.model('Clinic', clinicSchema);

module.exports = Clinic;

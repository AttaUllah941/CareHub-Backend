const mongoose = require('mongoose');

const BOOKING_STATUSES = ['pending', 'confirmed', 'sample_collected', 'report_ready', 'cancelled'];
const COLLECTION_TYPES = ['home', 'lab_visit'];

const patientSnapshotSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true, default: '' },
    address: { type: String, trim: true, default: '' },
  },
  { _id: false },
);

const labBookingSchema = new mongoose.Schema(
  {
    labId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lab',
      required: true,
      index: true,
    },
    testIds: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'LabTest' }],
      required: true,
      validate: {
        validator: (value) => Array.isArray(value) && value.length > 0,
        message: 'At least one test is required',
      },
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
    scheduledDate: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },
    scheduledSlot: {
      type: String,
      required: true,
      trim: true,
    },
    collectionType: {
      type: String,
      enum: COLLECTION_TYPES,
      required: true,
    },
    status: {
      type: String,
      enum: BOOKING_STATUSES,
      default: 'pending',
      index: true,
    },
    totalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'PKR',
      trim: true,
    },
  },
  { timestamps: true },
);

labBookingSchema.index({ patientId: 1, status: 1, scheduledDate: -1 });
labBookingSchema.index({ labId: 1, scheduledDate: -1 });

const LabBooking =
  mongoose.models.LabBooking || mongoose.model('LabBooking', labBookingSchema);

module.exports = {
  LabBooking,
  BOOKING_STATUSES,
  COLLECTION_TYPES,
};

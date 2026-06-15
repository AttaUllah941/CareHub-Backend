const mongoose = require('mongoose');
const { LAB_BOOKING_STATUS_VALUES } = require('../../../shared/enums/labBookingStatus.enum');
const { LAB_COLLECTION_TYPE_VALUES } = require('../../../shared/enums/labCollectionType.enum');

const bookingItemSchema = new mongoose.Schema(
  {
    labTestId: { type: mongoose.Schema.Types.ObjectId, ref: 'LabTest', required: true },
    testName: { type: String, required: true, trim: true, maxlength: 200 },
    testCode: { type: String, trim: true, maxlength: 50 },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, min: 1, default: 1 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: true },
);

const labBookingSchema = new mongoose.Schema(
  {
    bookingNumber: { type: String, required: true, unique: true, index: true },
    patientProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PatientProfile',
      required: true,
      index: true,
    },
    labId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lab', required: true, index: true },
    placedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: LAB_BOOKING_STATUS_VALUES,
      default: 'PENDING',
      index: true,
    },
    collectionType: {
      type: String,
      enum: LAB_COLLECTION_TYPE_VALUES,
      default: 'LAB_VISIT',
      index: true,
    },
    items: {
      type: [bookingItemSchema],
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: 'At least one test is required',
      },
    },
    scheduledDate: { type: Date, default: null },
    scheduledTimeSlot: { type: String, trim: true, maxlength: 50 },
    homeAddress: { type: String, trim: true, maxlength: 500 },
    homeCity: { type: String, trim: true, maxlength: 100 },
    homePhone: { type: String, trim: true, maxlength: 30 },
    collectionNotes: { type: String, trim: true, maxlength: 1000 },
    subtotal: { type: Number, min: 0, default: 0 },
    collectionFee: { type: Number, min: 0, default: 0 },
    total: { type: Number, min: 0, default: 0 },
    currency: { type: String, trim: true, default: 'PKR', maxlength: 10 },
    notes: { type: String, trim: true, maxlength: 1000 },
    cancelledAt: { type: Date, default: null },
    cancellationReason: { type: String, trim: true, maxlength: 500 },
    fulfilledByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
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
        if (ret.items) {
          ret.items = ret.items.map((item) => ({
            ...item,
            id: item._id?.toString(),
            _id: undefined,
          }));
        }
        return ret;
      },
    },
  },
);

module.exports = mongoose.model('LabBooking', labBookingSchema);

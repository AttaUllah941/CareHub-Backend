const mongoose = require('mongoose');

const ORDER_STATUSES = [
  'placed',
  'confirmed',
  'preparing',
  'out_for_delivery',
  'delivered',
  'cancelled',
];

const DELIVERY_TYPES = ['home_delivery', 'store_pickup'];
const PAYMENT_METHODS = ['cod', 'card', 'jazzcash', 'easypaisa'];

const orderItemSchema = new mongoose.Schema(
  {
    medicineId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Medicine',
      required: true,
    },
    pharmacyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Pharmacy',
      required: true,
    },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const medicineOrderSchema = new mongoose.Schema(
  {
    orderRef: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator: (items) => Array.isArray(items) && items.length > 0,
        message: 'At least one order item is required',
      },
    },
    deliveryType: {
      type: String,
      enum: DELIVERY_TYPES,
      required: true,
    },
    address: {
      type: String,
      required: true,
      trim: true,
    },
    paymentMethod: {
      type: String,
      enum: PAYMENT_METHODS,
      required: true,
    },
    patientName: {
      type: String,
      trim: true,
      default: '',
    },
    patientPhone: {
      type: String,
      trim: true,
      default: '',
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    scheduledDate: {
      type: String,
      trim: true,
      default: '',
    },
    scheduledTimeSlot: {
      type: String,
      trim: true,
      default: '',
    },
    couponCode: {
      type: String,
      trim: true,
      default: '',
    },
    prescriptionUrls: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ORDER_STATUSES,
      default: 'placed',
      index: true,
    },
    totalAmount: {
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

medicineOrderSchema.index({ userId: 1, status: 1, createdAt: -1 });

const MedicineOrder =
  mongoose.models.MedicineOrder || mongoose.model('MedicineOrder', medicineOrderSchema);

const STATUS_TRANSITIONS = {
  placed: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['out_for_delivery', 'cancelled'],
  out_for_delivery: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
};

module.exports = {
  MedicineOrder,
  ORDER_STATUSES,
  DELIVERY_TYPES,
  PAYMENT_METHODS,
  STATUS_TRANSITIONS,
};

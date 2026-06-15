const mongoose = require('mongoose');
const { PHARMACY_ORDER_STATUS_VALUES } = require('../../../shared/enums/pharmacyOrderStatus.enum');

const orderItemSchema = new mongoose.Schema(
  {
    medicineId: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine', required: true },
    medicineName: { type: String, required: true, trim: true, maxlength: 200 },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
    dosage: { type: String, trim: true, maxlength: 200 },
    instructions: { type: String, trim: true, maxlength: 500 },
  },
  { _id: true },
);

const pharmacyOrderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true, index: true },
    patientProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PatientProfile',
      required: true,
      index: true,
    },
    prescriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Prescription', default: null },
    prescriptionUploadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PrescriptionUpload',
      default: null,
    },
    placedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: PHARMACY_ORDER_STATUS_VALUES,
      default: 'PENDING',
      index: true,
    },
    items: {
      type: [orderItemSchema],
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: 'At least one order item is required',
      },
    },
    subtotal: { type: Number, min: 0, default: 0 },
    deliveryFee: { type: Number, min: 0, default: 0 },
    total: { type: Number, min: 0, default: 0 },
    currency: { type: String, trim: true, default: 'PKR', maxlength: 10 },
    deliveryType: { type: String, enum: ['PICKUP', 'DELIVERY'], default: 'PICKUP' },
    deliveryAddress: { type: String, trim: true, maxlength: 500 },
    notes: { type: String, trim: true, maxlength: 1000 },
    fulfilledByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    cancelledAt: { type: Date, default: null },
    cancellationReason: { type: String, trim: true, maxlength: 500 },
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

module.exports = mongoose.model('PharmacyOrder', pharmacyOrderSchema);

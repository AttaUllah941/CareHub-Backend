const mongoose = require('mongoose');
const { PAYMENT_STATUS_VALUES } = require('../../../shared/enums/paymentStatus.enum');
const { PAYMENT_GATEWAY_VALUES } = require('../../../shared/enums/paymentGateway.enum');
const { REFUND_STATUS_VALUES } = require('../../../shared/enums/refundStatus.enum');

const refundSchema = new mongoose.Schema(
  {
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, trim: true, maxlength: 10 },
    status: { type: String, enum: REFUND_STATUS_VALUES, default: 'PENDING' },
    reason: { type: String, trim: true, maxlength: 500 },
    gatewayRefundId: { type: String, trim: true },
    gatewayResponse: { type: mongoose.Schema.Types.Mixed },
    initiatedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    processedAt: { type: Date, default: null },
    failureReason: { type: String, trim: true, maxlength: 500 },
  },
  { timestamps: true },
);

const paymentSchema = new mongoose.Schema(
  {
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      required: true,
      index: true,
    },
    patientProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PatientProfile',
      required: true,
      index: true,
    },
    bookedByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    doctorProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DoctorProfile',
      required: true,
    },
    clinicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Clinic',
      required: true,
    },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, trim: true, default: 'PKR', maxlength: 10 },
    status: {
      type: String,
      enum: PAYMENT_STATUS_VALUES,
      default: 'PENDING',
      index: true,
    },
    gateway: {
      type: String,
      enum: PAYMENT_GATEWAY_VALUES,
      required: true,
      index: true,
    },
    gatewayOrderId: { type: String, trim: true, index: true },
    gatewayTransactionId: { type: String, trim: true, index: true },
    gatewayResponse: { type: mongoose.Schema.Types.Mixed },
    redirectUrl: { type: String, trim: true },
    idempotencyKey: { type: String, trim: true, unique: true, sparse: true },
    paidAt: { type: Date, default: null },
    failedAt: { type: Date, default: null },
    failureReason: { type: String, trim: true, maxlength: 500 },
    refundAmount: { type: Number, default: 0, min: 0 },
    refundedAt: { type: Date, default: null },
    refunds: { type: [refundSchema], default: [] },
    metadata: { type: mongoose.Schema.Types.Mixed },
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
        if (ret.refunds) {
          ret.refunds = ret.refunds.map((r) => ({
            ...r,
            id: r._id?.toString(),
            _id: undefined,
          }));
        }
        return ret;
      },
    },
  },
);

paymentSchema.index({ patientProfileId: 1, createdAt: -1 });
paymentSchema.index({ bookedByUserId: 1, createdAt: -1 });
paymentSchema.index({ gateway: 1, gatewayOrderId: 1 });

module.exports = mongoose.model('Payment', paymentSchema);

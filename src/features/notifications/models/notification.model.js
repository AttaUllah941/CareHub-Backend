const mongoose = require('mongoose');
const { NOTIFICATION_TYPE_VALUES } = require('../../../shared/enums/notificationType.enum');
const { NOTIFICATION_CHANNEL_VALUES } = require('../../../shared/enums/notificationChannel.enum');
const { NOTIFICATION_DELIVERY_STATUS_VALUES } = require('../../../shared/enums/notificationDeliveryStatus.enum');

const deliverySchema = new mongoose.Schema(
  {
    channel: { type: String, enum: NOTIFICATION_CHANNEL_VALUES, required: true },
    status: { type: String, enum: NOTIFICATION_DELIVERY_STATUS_VALUES, default: 'PENDING' },
    sentAt: { type: Date, default: null },
    error: { type: String, default: null },
  },
  { _id: true },
);

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: NOTIFICATION_TYPE_VALUES, required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    body: { type: String, required: true, trim: true, maxlength: 2000 },
    readAt: { type: Date, default: null, index: true },
    scheduledFor: { type: Date, default: null, index: true },
    sentAt: { type: Date, default: null },
    deliveries: { type: [deliverySchema], default: [] },
    metadata: {
      appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
      prescriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Prescription' },
      consultationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Consultation' },
      actionUrl: { type: String, trim: true },
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
        if (ret.deliveries) {
          ret.deliveries = ret.deliveries.map((d) => ({
            ...d,
            id: d._id?.toString(),
            _id: undefined,
          }));
        }
        return ret;
      },
    },
  },
);

notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ scheduledFor: 1, sentAt: 1, isActive: 1 });

module.exports = mongoose.model('Notification', notificationSchema);

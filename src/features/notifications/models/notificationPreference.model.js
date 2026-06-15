const mongoose = require('mongoose');

const notificationPreferenceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    emailEnabled: { type: Boolean, default: true },
    smsEnabled: { type: Boolean, default: true },
    pushEnabled: { type: Boolean, default: true },
    inAppEnabled: { type: Boolean, default: true },
    appointmentReminders: { type: Boolean, default: true },
    prescriptionAlerts: { type: Boolean, default: true },
    reminderLeadMinutes: {
      type: [Number],
      default: [1440, 60],
    },
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

module.exports = mongoose.model('NotificationPreference', notificationPreferenceSchema);

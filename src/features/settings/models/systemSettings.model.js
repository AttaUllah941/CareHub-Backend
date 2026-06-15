const mongoose = require('mongoose');
const {
  DEFAULT_GENERAL,
  DEFAULT_EMAIL,
  DEFAULT_SMS,
  DEFAULT_PAYMENT,
  DEFAULT_FEATURE_FLAGS,
} = require('../constants/settings.defaults');

const systemSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'global', unique: true, index: true },
    general: { type: mongoose.Schema.Types.Mixed, default: () => ({ ...DEFAULT_GENERAL }) },
    email: { type: mongoose.Schema.Types.Mixed, default: () => ({ ...DEFAULT_EMAIL }) },
    sms: { type: mongoose.Schema.Types.Mixed, default: () => ({ ...DEFAULT_SMS }) },
    payment: { type: mongoose.Schema.Types.Mixed, default: () => JSON.parse(JSON.stringify(DEFAULT_PAYMENT)) },
    featureFlags: { type: mongoose.Schema.Types.Mixed, default: () => ({ ...DEFAULT_FEATURE_FLAGS }) },
    updatedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
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

module.exports = mongoose.model('SystemSettings', systemSettingsSchema);

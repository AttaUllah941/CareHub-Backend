const mongoose = require('mongoose');

const videoSessionMessageSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VideoSession',
      required: true,
      index: true,
    },
    senderUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    messageType: { type: String, enum: ['TEXT', 'SYSTEM'], default: 'TEXT' },
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

videoSessionMessageSchema.index({ sessionId: 1, createdAt: 1 });

module.exports = mongoose.model('VideoSessionMessage', videoSessionMessageSchema);

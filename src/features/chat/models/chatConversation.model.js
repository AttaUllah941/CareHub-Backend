const mongoose = require('mongoose');

const chatConversationSchema = new mongoose.Schema(
  {
    doctorUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    patientUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
    lastMessageAt: { type: Date, index: true },
    lastMessagePreview: { type: String, trim: true, maxlength: 500 },
    doctorUnreadCount: { type: Number, default: 0, min: 0 },
    patientUnreadCount: { type: Number, default: 0, min: 0 },
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

chatConversationSchema.index({ doctorUserId: 1, patientUserId: 1 }, { unique: true });
chatConversationSchema.index({ lastMessageAt: -1 });

module.exports = mongoose.model('ChatConversation', chatConversationSchema);

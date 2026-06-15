const mongoose = require('mongoose');
const { CHAT_MESSAGE_TYPE_VALUES } = require('../../../shared/enums/chatMessageType.enum');

const readReceiptSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    readAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const deliveryReceiptSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    deliveredAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const attachmentSchema = new mongoose.Schema(
  {
    storedFileName: { type: String, required: true },
    originalFileName: { type: String, required: true },
    mimeType: { type: String, required: true },
    sizeBytes: { type: Number, required: true },
    relativePath: { type: String, required: true },
  },
  { _id: false },
);

const chatMessageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChatConversation',
      required: true,
      index: true,
    },
    senderUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, trim: true, maxlength: 4000 },
    messageType: { type: String, enum: CHAT_MESSAGE_TYPE_VALUES, default: 'TEXT' },
    attachment: attachmentSchema,
    readBy: [readReceiptSchema],
    deliveredTo: [deliveryReceiptSchema],
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

chatMessageSchema.index({ conversationId: 1, createdAt: -1 });

module.exports = mongoose.model('ChatMessage', chatMessageSchema);

const mongoose = require('mongoose');
const config = require('../../../config');

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AiConversation',
      required: true,
      index: true,
    },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true, maxlength: 12000 },
    /** Structured UI payloads (cards, confirmations). Trimmed before storage. */
    actions: { type: [mongoose.Schema.Types.Mixed], default: [] },
    /** Names of tools used for this reply (audit/debug only — never replayed to the model). */
    toolsUsed: { type: [String], default: [] },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

messageSchema.index({ conversationId: 1, createdAt: 1 });
messageSchema.index({ createdAt: 1 }, { expireAfterSeconds: config.ai.retentionDays * 24 * 60 * 60 });

const AiMessage = mongoose.models.AiMessage || mongoose.model('AiMessage', messageSchema);

module.exports = { AiMessage };

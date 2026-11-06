const mongoose = require('mongoose');
const config = require('../../../config');

const conversationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    /** Agent that owns the conversation (derived from the verified role, never from the client). */
    agent: { type: String, enum: ['PATIENT', 'DOCTOR', 'ADMIN'], required: true },
    title: { type: String, trim: true, maxlength: 120, default: 'New chat' },
    /**
     * Small structured working memory (e.g. last doctor search parameters) so follow-ups like
     * "show cheaper ones" resolve. Contains no free-text medical content.
     */
    context: { type: mongoose.Schema.Types.Mixed, default: {} },
    lastMessageAt: { type: Date, default: Date.now },
  },
  { timestamps: true, minimize: false },
);

conversationSchema.index({ userId: 1, lastMessageAt: -1 });
// Data minimisation: conversations expire automatically after the retention window.
conversationSchema.index(
  { lastMessageAt: 1 },
  { expireAfterSeconds: config.ai.retentionDays * 24 * 60 * 60 },
);

const AiConversation =
  mongoose.models.AiConversation || mongoose.model('AiConversation', conversationSchema);

module.exports = { AiConversation };

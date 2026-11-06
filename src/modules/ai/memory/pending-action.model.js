const mongoose = require('mongoose');

const PENDING_STATUSES = ['pending', 'executing', 'executed', 'failed', 'cancelled', 'expired'];

/**
 * A consequential tool call proposed by the model and awaiting explicit user confirmation.
 * The stored args were validated at proposal time and are re-validated at execution time.
 */
const pendingActionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'AiConversation', required: true },
    agent: { type: String, required: true },
    tool: { type: String, required: true },
    args: { type: mongoose.Schema.Types.Mixed, required: true },
    summary: { type: String, required: true, maxlength: 600 },
    status: { type: String, enum: PENDING_STATUSES, default: 'pending', index: true },
    errorMessage: { type: String, default: '' },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

pendingActionSchema.index({ conversationId: 1, status: 1 });
// Housekeeping: drop proposals a day after they expire.
pendingActionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 24 * 60 * 60 });

const AiPendingAction =
  mongoose.models.AiPendingAction || mongoose.model('AiPendingAction', pendingActionSchema);

module.exports = { AiPendingAction, PENDING_STATUSES };

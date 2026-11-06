const mongoose = require('mongoose');

/** Immutable record of every consequential action executed through the assistant. */
const auditLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    role: { type: String, required: true },
    agent: { type: String, required: true },
    tool: { type: String, required: true, index: true },
    conversationId: { type: mongoose.Schema.Types.ObjectId },
    pendingActionId: { type: mongoose.Schema.Types.ObjectId },
    /** PII-redacted copy of the arguments (ids and non-identifying fields only). */
    args: { type: mongoose.Schema.Types.Mixed },
    outcome: { type: String, enum: ['success', 'failure'], required: true },
    error: { type: String, default: '' },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

auditLogSchema.index({ createdAt: -1 });

const AiAuditLog = mongoose.models.AiAuditLog || mongoose.model('AiAuditLog', auditLogSchema);

module.exports = { AiAuditLog };

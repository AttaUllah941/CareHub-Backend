const mongoose = require('mongoose');
const { AUDIT_ACTION_VALUES } = require('../../../shared/enums/auditAction.enum');

const auditLogSchema = new mongoose.Schema(
  {
    actorUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    actorEmail: { type: String, trim: true, index: true },
    actorRole: { type: String, trim: true, index: true },
    action: { type: String, enum: AUDIT_ACTION_VALUES, required: true, index: true },
    module: { type: String, required: true, trim: true, index: true },
    entityType: { type: String, trim: true, index: true },
    entityId: { type: String, trim: true, index: true },
    entityLabel: { type: String, trim: true },
    description: { type: String, trim: true, maxlength: 1000 },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    ipAddress: { type: String, trim: true },
    userAgent: { type: String, trim: true, maxlength: 500 },
    success: { type: Boolean, default: true, index: true },
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

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ module: 1, action: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);

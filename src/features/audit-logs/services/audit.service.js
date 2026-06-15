const logger = require('../../../core/utils/logger');
const { NotFoundError } = require('../../../core/errors/AppError');
const { buildActor } = require('../utils/audit.helper');

class AuditService {
  constructor(auditLogRepository) {
    this.auditLogRepository = auditLogRepository;
  }

  /**
   * Records an audit event. Failures are logged but never thrown.
   */
  async log({
    action,
    module,
    entityType,
    entityId,
    entityLabel,
    description,
    metadata,
    requestedBy,
    actorEmail,
    ipAddress,
    userAgent,
    success = true,
  }) {
    try {
      const actor = buildActor(requestedBy, actorEmail);
      await this.auditLogRepository.create({
        ...actor,
        action,
        module,
        entityType: entityType || module,
        entityId: entityId?.toString?.() || entityId,
        entityLabel,
        description,
        metadata: metadata || {},
        ipAddress,
        userAgent,
        success,
      });
    } catch (err) {
      logger.error(`Audit log failed: ${err.message}`);
    }
  }

  async getLogs(query, requestedBy) {
    void requestedBy;
    const result = await this.auditLogRepository.findAll(query);
    return {
      logs: result.items.map((item) => this._format(item)),
      pagination: result.pagination,
    };
  }

  async getLogById(id, requestedBy) {
    void requestedBy;
    const log = await this.auditLogRepository.findById(id);
    if (!log || !log.isActive) throw new NotFoundError('Audit log not found');
    return this._format(log);
  }

  _format(log) {
    const json = log.toJSON ? log.toJSON() : log;
    const actor = json.actorUserId;
    return {
      ...json,
      actorUserId: actor?.id || actor?._id?.toString() || json.actorUserId?.toString(),
      actor: actor && typeof actor === 'object'
        ? {
            id: actor.id || actor._id?.toString(),
            firstName: actor.firstName,
            lastName: actor.lastName,
            email: actor.email,
            role: actor.role,
          }
        : undefined,
    };
  }
}

module.exports = AuditService;

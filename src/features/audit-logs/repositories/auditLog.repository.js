const AuditLog = require('../models/auditLog.model');

class AuditLogRepository {
  create(data) {
    return AuditLog.create(data);
  }

  findById(id) {
    return AuditLog.findById(id).populate('actorUserId', 'firstName lastName email role');
  }

  async findAll({
    page = 1,
    limit = 20,
    action,
    module,
    entityType,
    actorUserId,
    success,
    fromDate,
    toDate,
    search,
    sortOrder = 'desc',
  } = {}) {
    const filter = { isActive: true };

    if (action) filter.action = action;
    if (module) filter.module = module;
    if (entityType) filter.entityType = entityType;
    if (actorUserId) filter.actorUserId = actorUserId;
    if (success !== undefined && success !== '') filter.success = success === true || success === 'true';

    if (fromDate || toDate) {
      filter.createdAt = {};
      if (fromDate) filter.createdAt.$gte = new Date(fromDate);
      if (toDate) {
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      filter.$or = [
        { actorEmail: regex },
        { entityLabel: regex },
        { description: regex },
        { entityId: regex },
      ];
    }

    const skip = (page - 1) * limit;
    const sort = { createdAt: sortOrder === 'asc' ? 1 : -1 };

    const [items, total] = await Promise.all([
      AuditLog.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('actorUserId', 'firstName lastName email role'),
      AuditLog.countDocuments(filter),
    ]);

    return {
      items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  }
}

module.exports = AuditLogRepository;

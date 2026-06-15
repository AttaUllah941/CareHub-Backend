const Notification = require('../models/notification.model');

const POPULATE_FIELDS = [{ path: 'userId', select: 'firstName lastName email phone' }];

class NotificationRepository {
  async create(data) {
    const notification = await Notification.create(data);
    return notification.populate(POPULATE_FIELDS);
  }

  async findById(id) {
    return Notification.findById(id).populate(POPULATE_FIELDS);
  }

  async findByUserId(userId, { page = 1, limit = 20, unreadOnly = false } = {}) {
    const filter = { userId, isActive: true, sentAt: { $ne: null } };
    if (unreadOnly) filter.readAt = null;

    const skip = (page - 1) * limit;
    const [notifications, total] = await Promise.all([
      Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate(POPULATE_FIELDS),
      Notification.countDocuments(filter),
    ]);

    return {
      notifications,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  async countUnread(userId) {
    return Notification.countDocuments({ userId, isActive: true, sentAt: { $ne: null }, readAt: null });
  }

  async markAsRead(id, userId) {
    return Notification.findOneAndUpdate(
      { _id: id, userId, isActive: true },
      { readAt: new Date() },
      { new: true },
    ).populate(POPULATE_FIELDS);
  }

  async markAllAsRead(userId) {
    await Notification.updateMany(
      { userId, isActive: true, readAt: null, sentAt: { $ne: null } },
      { readAt: new Date() },
    );
    return { message: 'All notifications marked as read' };
  }

  async findDueScheduled(limit = 50) {
    const now = new Date();
    return Notification.find({
      isActive: true,
      sentAt: null,
      scheduledFor: { $lte: now },
    })
      .sort({ scheduledFor: 1 })
      .limit(limit)
      .populate(POPULATE_FIELDS);
  }

  async updateById(id, data) {
    return Notification.findByIdAndUpdate(id, data, { new: true, runValidators: true }).populate(
      POPULATE_FIELDS,
    );
  }

  async cancelScheduledForAppointment(appointmentId) {
    await Notification.updateMany(
      {
        'metadata.appointmentId': appointmentId,
        sentAt: null,
        isActive: true,
      },
      { isActive: false },
    );
  }

  async findAll({ page = 1, limit = 20, userId, type, search } = {}) {
    const filter = { isActive: true };
    if (userId) filter.userId = userId;
    if (type) filter.type = type;
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      filter.$or = [{ title: regex }, { body: regex }];
    }

    const skip = (page - 1) * limit;
    const [notifications, total] = await Promise.all([
      Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate(POPULATE_FIELDS),
      Notification.countDocuments(filter),
    ]);

    return {
      notifications,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  }
}

module.exports = NotificationRepository;

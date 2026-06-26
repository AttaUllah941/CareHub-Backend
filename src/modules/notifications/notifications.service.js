const { NotFoundError } = require('../../core/errors/AppError');
const { parsePaginationQuery, buildPaginationMeta } = require('../../core/utils/pagination.util');
const notificationsRepository = require('./notifications.repository');

const toNotificationResponse = (notification) => ({
  id: notification._id.toString(),
  userId: notification.userId.toString(),
  type: notification.type,
  title: notification.title,
  body: notification.body,
  isRead: notification.isRead,
  createdAt: notification.createdAt?.toISOString(),
  updatedAt: notification.updatedAt?.toISOString(),
});

const createNotification = async ({ userId, type, title, body }) => {
  const notification = await notificationsRepository.create({
    userId,
    type,
    title,
    body,
    isRead: false,
  });

  return toNotificationResponse(notification);
};

const listMyNotifications = async (user, query) => {
  const { page, limit, skip } = parsePaginationQuery(query, ['createdAt']);
  const unreadOnly = query.unreadOnly === 'true' || query.unreadOnly === true;

  const [notifications, total] = await Promise.all([
    notificationsRepository.findByUser(user.id, { skip, limit, unreadOnly }),
    notificationsRepository.countByUser(user.id, { unreadOnly }),
  ]);

  return {
    notifications: notifications.map(toNotificationResponse),
    pagination: buildPaginationMeta(page, limit, total),
  };
};

const markNotificationRead = async (id, user) => {
  if (!notificationsRepository.isValidObjectId(id)) {
    throw new NotFoundError('Notification not found');
  }

  const notification = await notificationsRepository.markAsRead(id, user.id);
  if (!notification) {
    throw new NotFoundError('Notification not found');
  }

  return { notification: toNotificationResponse(notification) };
};

module.exports = {
  createNotification,
  listMyNotifications,
  markNotificationRead,
  toNotificationResponse,
};

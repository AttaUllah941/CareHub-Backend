const notificationsService = require('./notifications.service');

const listMyNotifications = async (req, res) => {
  const result = await notificationsService.listMyNotifications(req.user, req.query);
  res.json({ success: true, message: 'Notifications retrieved', data: result });
};

const markNotificationRead = async (req, res) => {
  const result = await notificationsService.markNotificationRead(req.params.id, req.user);
  res.json({ success: true, message: 'Notification marked as read', data: result });
};

module.exports = {
  listMyNotifications,
  markNotificationRead,
};

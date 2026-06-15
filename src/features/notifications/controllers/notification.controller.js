const asyncHandler = require('../../../core/utils/asyncHandler');
const { HttpStatus } = require('../../../shared/constants/httpStatus.constants');

class NotificationController {
  constructor(notificationService) {
    this.notificationService = notificationService;
  }

  getMyNotifications = asyncHandler(async (req, res) => {
    const result = await this.notificationService.getMyNotifications(req.user.id, req.query);
    res.status(HttpStatus.OK).json({ success: true, data: result });
  });

  getUnreadCount = asyncHandler(async (req, res) => {
    const result = await this.notificationService.getUnreadCount(req.user.id);
    res.status(HttpStatus.OK).json({ success: true, data: result });
  });

  markAsRead = asyncHandler(async (req, res) => {
    const notification = await this.notificationService.markAsRead(req.params.id, req.user.id);
    res.status(HttpStatus.OK).json({
      success: true,
      message: 'Notification marked as read',
      data: { notification },
    });
  });

  markAllAsRead = asyncHandler(async (req, res) => {
    const result = await this.notificationService.markAllAsRead(req.user.id);
    res.status(HttpStatus.OK).json({ success: true, message: result.message });
  });

  getPreferences = asyncHandler(async (req, res) => {
    const preferences = await this.notificationService.getPreferences(req.user.id);
    res.status(HttpStatus.OK).json({ success: true, data: { preferences } });
  });

  updatePreferences = asyncHandler(async (req, res) => {
    const preferences = await this.notificationService.updatePreferences(req.user.id, req.body);
    res.status(HttpStatus.OK).json({
      success: true,
      message: 'Notification preferences updated',
      data: { preferences },
    });
  });

  getAllNotifications = asyncHandler(async (req, res) => {
    const result = await this.notificationService.getAllNotifications(req.query, req.user);
    res.status(HttpStatus.OK).json({ success: true, data: result });
  });
}

module.exports = NotificationController;

const logger = require('../../../core/utils/logger');

class NotificationReminderService {
  constructor(notificationService) {
    this.notificationService = notificationService;
    this._intervalId = null;
  }

  start(intervalMs = 60 * 1000) {
    if (this._intervalId) return;

    this._intervalId = setInterval(() => {
      this.notificationService.processDueNotifications().catch((err) => {
        logger.error('Reminder worker error:', err);
      });
    }, intervalMs);

    logger.info('Notification reminder worker started');
  }

  stop() {
    if (this._intervalId) {
      clearInterval(this._intervalId);
      this._intervalId = null;
    }
  }
}

module.exports = NotificationReminderService;

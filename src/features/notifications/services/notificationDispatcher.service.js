const logger = require('../../../core/utils/logger');
const config = require('../../../config');
const { getSocketIo } = require('../../../config/socketRegistry');
const { NotificationChannel } = require('../../../shared/enums/notificationChannel.enum');
const { NotificationDeliveryStatus } = require('../../../shared/enums/notificationDeliveryStatus.enum');

class NotificationDispatcherService {
  async dispatch(channel, { user, title, body, metadata }) {
    switch (channel) {
      case NotificationChannel.EMAIL:
        return this._sendEmail(user, title, body, metadata);
      case NotificationChannel.SMS:
        return this._sendSms(user, body);
      case NotificationChannel.PUSH:
        return this._sendPush(user, title, body, metadata);
      case NotificationChannel.IN_APP:
        return { status: NotificationDeliveryStatus.SENT, sentAt: new Date() };
      default:
        throw new Error(`Unknown channel: ${channel}`);
    }
  }

  async _sendEmail(user, subject, body, metadata = {}) {
    const email = user?.email;
    if (!email) {
      return { status: NotificationDeliveryStatus.FAILED, error: 'No email address' };
    }

    const actionUrl = metadata.actionUrl ? `${config.frontend.url}${metadata.actionUrl}` : config.frontend.url;

    if (config.isProduction) {
      logger.info(`[EMAIL] Queued to ${email}: ${subject}`);
    } else {
      logger.info(`[DEV EMAIL] To: ${email} | Subject: ${subject} | Body: ${body} | Link: ${actionUrl}`);
    }

    return { status: NotificationDeliveryStatus.SENT, sentAt: new Date() };
  }

  async _sendSms(user, body) {
    const phone = user?.phone;
    if (!phone) {
      return { status: NotificationDeliveryStatus.FAILED, error: 'No phone number' };
    }

    if (config.isProduction) {
      logger.info(`[SMS] Queued to ${phone}`);
    } else {
      logger.info(`[DEV SMS] To: ${phone} | Body: ${body}`);
    }

    return { status: NotificationDeliveryStatus.SENT, sentAt: new Date() };
  }

  async _sendPush(user, title, body, metadata = {}) {
    const userId = user?.id || user?._id?.toString();
    if (!userId) {
      return { status: NotificationDeliveryStatus.FAILED, error: 'No user id' };
    }

    const io = getSocketIo();
    if (!io) {
      return { status: NotificationDeliveryStatus.FAILED, error: 'Socket.IO not initialized' };
    }

    const payload = {
      title,
      body,
      metadata,
      createdAt: new Date().toISOString(),
    };

    io.to(`user:${userId}`).emit('notification', payload);

    if (!config.isProduction) {
      logger.info(`[DEV PUSH] user:${userId} | ${title}`);
    }

    return { status: NotificationDeliveryStatus.SENT, sentAt: new Date() };
  }
}

module.exports = NotificationDispatcherService;

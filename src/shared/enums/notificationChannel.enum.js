const NotificationChannel = {
  IN_APP: 'IN_APP',
  EMAIL: 'EMAIL',
  SMS: 'SMS',
  PUSH: 'PUSH',
};

const NOTIFICATION_CHANNEL_VALUES = Object.values(NotificationChannel);

module.exports = { NotificationChannel, NOTIFICATION_CHANNEL_VALUES };

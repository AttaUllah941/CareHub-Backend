const NotificationDeliveryStatus = {
  PENDING: 'PENDING',
  SENT: 'SENT',
  FAILED: 'FAILED',
};

const NOTIFICATION_DELIVERY_STATUS_VALUES = Object.values(NotificationDeliveryStatus);

module.exports = { NotificationDeliveryStatus, NOTIFICATION_DELIVERY_STATUS_VALUES };

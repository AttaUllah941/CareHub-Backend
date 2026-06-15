const PharmacyOrderStatus = Object.freeze({
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  PREPARING: 'PREPARING',
  READY: 'READY',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
});

const PHARMACY_ORDER_STATUS_VALUES = Object.values(PharmacyOrderStatus);

module.exports = { PharmacyOrderStatus, PHARMACY_ORDER_STATUS_VALUES };

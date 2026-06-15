const LabBookingStatus = Object.freeze({
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  SAMPLE_COLLECTED: 'SAMPLE_COLLECTED',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
});

const LAB_BOOKING_STATUS_VALUES = Object.values(LabBookingStatus);

module.exports = { LabBookingStatus, LAB_BOOKING_STATUS_VALUES };

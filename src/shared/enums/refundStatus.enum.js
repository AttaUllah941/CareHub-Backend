const RefundStatus = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  SUCCEEDED: 'SUCCEEDED',
  FAILED: 'FAILED',
};

const REFUND_STATUS_VALUES = Object.values(RefundStatus);

module.exports = { RefundStatus, REFUND_STATUS_VALUES };

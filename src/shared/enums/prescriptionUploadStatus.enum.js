const PrescriptionUploadStatus = Object.freeze({
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
});

const PRESCRIPTION_UPLOAD_STATUS_VALUES = Object.values(PrescriptionUploadStatus);

module.exports = { PrescriptionUploadStatus, PRESCRIPTION_UPLOAD_STATUS_VALUES };

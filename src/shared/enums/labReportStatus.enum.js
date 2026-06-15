const LabReportStatus = Object.freeze({
  PENDING: 'PENDING',
  AVAILABLE: 'AVAILABLE',
  REVIEWED: 'REVIEWED',
});

const LAB_REPORT_STATUS_VALUES = Object.values(LabReportStatus);

module.exports = { LabReportStatus, LAB_REPORT_STATUS_VALUES };

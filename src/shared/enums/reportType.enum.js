const ReportType = {
  REVENUE: 'REVENUE',
  DOCTORS: 'DOCTORS',
  PATIENTS: 'PATIENTS',
  APPOINTMENTS: 'APPOINTMENTS',
};

const REPORT_TYPE_VALUES = Object.values(ReportType);

const ExportFormat = {
  PDF: 'PDF',
  EXCEL: 'EXCEL',
};

const EXPORT_FORMAT_VALUES = Object.values(ExportFormat);

module.exports = { ReportType, REPORT_TYPE_VALUES, ExportFormat, EXPORT_FORMAT_VALUES };

const ExcelJS = require('exceljs');
const { ReportType } = require('../../../shared/enums/reportType.enum');

function reportSheetName(type) {
  const names = {
    [ReportType.REVENUE]: 'Revenue',
    [ReportType.DOCTORS]: 'Doctors',
    [ReportType.PATIENTS]: 'Patients',
    [ReportType.APPOINTMENTS]: 'Appointments',
  };
  return names[type] || 'Report';
}

function getColumns(type) {
  switch (type) {
    case ReportType.REVENUE:
      return [
        { header: 'Paid At', key: 'paidAt', width: 18 },
        { header: 'Gateway', key: 'gateway', width: 12 },
        { header: 'Amount', key: 'amount', width: 12 },
        { header: 'Refund', key: 'refundAmount', width: 10 },
        { header: 'Currency', key: 'currency', width: 10 },
        { header: 'Status', key: 'status', width: 12 },
        { header: 'Patient', key: 'patient', width: 22 },
        { header: 'Doctor', key: 'doctor', width: 22 },
      ];
    case ReportType.DOCTORS:
      return [
        { header: 'Name', key: 'name', width: 22 },
        { header: 'Email', key: 'email', width: 26 },
        { header: 'Title', key: 'title', width: 10 },
        { header: 'Status', key: 'verificationStatus', width: 12 },
        { header: 'Fee', key: 'consultationFee', width: 10 },
        { header: 'Experience', key: 'yearsOfExperience', width: 12 },
        { header: 'City', key: 'city', width: 14 },
        { header: 'Specialties', key: 'specialties', width: 24 },
        { header: 'Appointments', key: 'appointmentCount', width: 14 },
        { header: 'Joined', key: 'createdAt', width: 18 },
      ];
    case ReportType.PATIENTS:
      return [
        { header: 'Name', key: 'name', width: 22 },
        { header: 'Email', key: 'email', width: 26 },
        { header: 'Phone', key: 'phone', width: 16 },
        { header: 'City', key: 'city', width: 14 },
        { header: 'Gender', key: 'gender', width: 10 },
        { header: 'Active', key: 'isActive', width: 8 },
        { header: 'Appointments', key: 'appointmentCount', width: 14 },
        { header: 'Joined', key: 'createdAt', width: 18 },
      ];
    case ReportType.APPOINTMENTS:
      return [
        { header: 'Date', key: 'appointmentDate', width: 14 },
        { header: 'Start', key: 'startTime', width: 10 },
        { header: 'End', key: 'endTime', width: 10 },
        { header: 'Status', key: 'status', width: 12 },
        { header: 'Payment', key: 'paymentStatus', width: 12 },
        { header: 'Fee', key: 'consultationFee', width: 10 },
        { header: 'Patient', key: 'patient', width: 22 },
        { header: 'Doctor', key: 'doctor', width: 22 },
        { header: 'Clinic', key: 'clinic', width: 18 },
      ];
    default:
      return [];
  }
}

async function generateReportExcel(report) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'CareHub';
  workbook.created = new Date();

  const summarySheet = workbook.addWorksheet('Summary');
  summarySheet.addRow(['CareHub Report', report.type]);
  summarySheet.addRow(['From', report.meta.fromDate || 'All time']);
  summarySheet.addRow(['To', report.meta.toDate || 'Present']);
  summarySheet.addRow(['Generated', report.meta.generatedAt]);
  summarySheet.addRow([]);
  summarySheet.addRow(['Summary']);
  Object.entries(report.summary).forEach(([key, value]) => {
    summarySheet.addRow([key, value]);
  });

  const dataSheet = workbook.addWorksheet(reportSheetName(report.type));
  const columns = getColumns(report.type);
  dataSheet.columns = columns;
  dataSheet.getRow(1).font = { bold: true };
  dataSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0D9488' },
  };
  dataSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

  (report.rows || []).forEach((row) => {
    dataSheet.addRow(row);
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

module.exports = { generateReportExcel };

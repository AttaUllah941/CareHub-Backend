const PDFDocument = require('pdfkit');
const { ReportType } = require('../../../shared/enums/reportType.enum');

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatPeriod(meta) {
  const from = meta.fromDate ? formatDate(meta.fromDate) : 'All time';
  const to = meta.toDate ? formatDate(meta.toDate) : 'Present';
  return `${from} — ${to}`;
}

function reportTitle(type) {
  const titles = {
    [ReportType.REVENUE]: 'Revenue Report',
    [ReportType.DOCTORS]: 'Doctor Report',
    [ReportType.PATIENTS]: 'Patient Report',
    [ReportType.APPOINTMENTS]: 'Appointment Report',
  };
  return titles[type] || 'CareHub Report';
}

function writeSummary(doc, report) {
  doc.fontSize(11).fillColor('#111827').text('Summary', { underline: true });
  doc.moveDown(0.3);
  doc.fontSize(10).fillColor('#374151');
  Object.entries(report.summary).forEach(([key, value]) => {
    const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase());
    doc.text(`${label}: ${value}`);
  });
  doc.moveDown();
}

function writeTable(doc, headers, rows, maxRows = 40) {
  doc.fontSize(11).fillColor('#111827').text('Details', { underline: true });
  doc.moveDown(0.5);
  const slice = rows.slice(0, maxRows);
  slice.forEach((row, index) => {
    doc.fontSize(9).fillColor('#0d9488').text(`Row ${index + 1}`);
    doc.fontSize(9).fillColor('#374151');
    headers.forEach((h) => {
      const val = row[h.key];
      doc.text(`  ${h.label}: ${val ?? '—'}`);
    });
    doc.moveDown(0.3);
  });
  if (rows.length > maxRows) {
    doc.fontSize(8).fillColor('#9ca3af').text(`... and ${rows.length - maxRows} more rows`);
  }
}

function getTableConfig(type) {
  switch (type) {
    case ReportType.REVENUE:
      return {
        headers: [
          { key: 'paidAt', label: 'Paid At' },
          { key: 'gateway', label: 'Gateway' },
          { key: 'amount', label: 'Amount' },
          { key: 'patient', label: 'Patient' },
          { key: 'doctor', label: 'Doctor' },
        ],
      };
    case ReportType.DOCTORS:
      return {
        headers: [
          { key: 'name', label: 'Name' },
          { key: 'verificationStatus', label: 'Status' },
          { key: 'consultationFee', label: 'Fee' },
          { key: 'appointmentCount', label: 'Appointments' },
          { key: 'city', label: 'City' },
        ],
      };
    case ReportType.PATIENTS:
      return {
        headers: [
          { key: 'name', label: 'Name' },
          { key: 'email', label: 'Email' },
          { key: 'city', label: 'City' },
          { key: 'appointmentCount', label: 'Appointments' },
          { key: 'isActive', label: 'Active' },
        ],
      };
    case ReportType.APPOINTMENTS:
      return {
        headers: [
          { key: 'appointmentDate', label: 'Date' },
          { key: 'startTime', label: 'Time' },
          { key: 'status', label: 'Status' },
          { key: 'patient', label: 'Patient' },
          { key: 'doctor', label: 'Doctor' },
          { key: 'clinic', label: 'Clinic' },
        ],
      };
    default:
      return { headers: [] };
  }
}

function generateReportPdf(report) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(22).fillColor('#0d9488').text('CareHub', { align: 'center' });
    doc.fontSize(16).fillColor('#374151').text(reportTitle(report.type), { align: 'center' });
    doc.fontSize(10).fillColor('#6b7280').text(`Period: ${formatPeriod(report.meta)}`, { align: 'center' });
    doc.text(`Generated: ${formatDate(report.meta.generatedAt)}`, { align: 'center' });
    doc.moveDown(1.5);

    writeSummary(doc, report);

    if (report.byGateway?.length) {
      doc.fontSize(11).fillColor('#111827').text('By Gateway', { underline: true });
      doc.moveDown(0.3);
      doc.fontSize(10).fillColor('#374151');
      report.byGateway.forEach((g) => doc.text(`${g.gateway}: ${g.amount} (${g.count} txns)`));
      doc.moveDown();
    }

    if (report.byStatus?.length) {
      doc.fontSize(11).fillColor('#111827').text('By Status', { underline: true });
      doc.moveDown(0.3);
      doc.fontSize(10).fillColor('#374151');
      report.byStatus.forEach((s) => doc.text(`${s.status}: ${s.count}`));
      doc.moveDown();
    }

    const { headers } = getTableConfig(report.type);
    if (headers.length && report.rows?.length) {
      writeTable(doc, headers, report.rows);
    }

    doc.moveDown(2);
    doc.fontSize(9).fillColor('#9ca3af').text('CareHub — Confidential Report', { align: 'center' });
    doc.end();
  });
}

module.exports = { generateReportPdf };

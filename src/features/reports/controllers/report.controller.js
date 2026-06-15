const asyncHandler = require('../../../core/utils/asyncHandler');
const { HttpStatus } = require('../../../shared/constants/httpStatus.constants');

class ReportController {
  constructor(reportService) {
    this.reportService = reportService;
  }

  getRevenueReport = asyncHandler(async (req, res) => {
    const report = await this.reportService.getRevenueReport(req.query, req.user);
    res.status(HttpStatus.OK).json({ success: true, data: { report } });
  });

  getDoctorReport = asyncHandler(async (req, res) => {
    const report = await this.reportService.getDoctorReport(req.query, req.user);
    res.status(HttpStatus.OK).json({ success: true, data: { report } });
  });

  getPatientReport = asyncHandler(async (req, res) => {
    const report = await this.reportService.getPatientReport(req.query, req.user);
    res.status(HttpStatus.OK).json({ success: true, data: { report } });
  });

  getAppointmentReport = asyncHandler(async (req, res) => {
    const report = await this.reportService.getAppointmentReport(req.query, req.user);
    res.status(HttpStatus.OK).json({ success: true, data: { report } });
  });

  exportRevenuePdf = asyncHandler(async (req, res) => {
    const { buffer, filename, contentType } = await this.reportService.exportPdf(
      'REVENUE',
      req.query,
      req.user,
    );
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(HttpStatus.OK).send(buffer);
  });

  exportRevenueExcel = asyncHandler(async (req, res) => {
    const { buffer, filename, contentType } = await this.reportService.exportExcel(
      'REVENUE',
      req.query,
      req.user,
    );
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(HttpStatus.OK).send(buffer);
  });

  exportDoctorPdf = asyncHandler(async (req, res) => {
    const { buffer, filename, contentType } = await this.reportService.exportPdf(
      'DOCTORS',
      req.query,
      req.user,
    );
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(HttpStatus.OK).send(buffer);
  });

  exportDoctorExcel = asyncHandler(async (req, res) => {
    const { buffer, filename, contentType } = await this.reportService.exportExcel(
      'DOCTORS',
      req.query,
      req.user,
    );
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(HttpStatus.OK).send(buffer);
  });

  exportPatientPdf = asyncHandler(async (req, res) => {
    const { buffer, filename, contentType } = await this.reportService.exportPdf(
      'PATIENTS',
      req.query,
      req.user,
    );
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(HttpStatus.OK).send(buffer);
  });

  exportPatientExcel = asyncHandler(async (req, res) => {
    const { buffer, filename, contentType } = await this.reportService.exportExcel(
      'PATIENTS',
      req.query,
      req.user,
    );
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(HttpStatus.OK).send(buffer);
  });

  exportAppointmentPdf = asyncHandler(async (req, res) => {
    const { buffer, filename, contentType } = await this.reportService.exportPdf(
      'APPOINTMENTS',
      req.query,
      req.user,
    );
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(HttpStatus.OK).send(buffer);
  });

  exportAppointmentExcel = asyncHandler(async (req, res) => {
    const { buffer, filename, contentType } = await this.reportService.exportExcel(
      'APPOINTMENTS',
      req.query,
      req.user,
    );
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(HttpStatus.OK).send(buffer);
  });
}

module.exports = ReportController;

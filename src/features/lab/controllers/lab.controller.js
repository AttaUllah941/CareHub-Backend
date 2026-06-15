const asyncHandler = require('../../../core/utils/asyncHandler');
const { HttpStatus } = require('../../../shared/constants/httpStatus.constants');

class LabController {
  constructor(labService) {
    this.labService = labService;
  }

  getLabs = asyncHandler(async (req, res) => {
    const result = await this.labService.getLabs(req.query, req.user);
    res.status(HttpStatus.OK).json({ success: true, data: result });
  });

  getLabById = asyncHandler(async (req, res) => {
    const lab = await this.labService.getLabById(req.params.id);
    res.status(HttpStatus.OK).json({ success: true, data: { lab } });
  });

  createLab = asyncHandler(async (req, res) => {
    const lab = await this.labService.createLab(req.body, req.user);
    res.status(HttpStatus.CREATED).json({ success: true, message: 'Lab created', data: { lab } });
  });

  updateLab = asyncHandler(async (req, res) => {
    const lab = await this.labService.updateLab(req.params.id, req.body, req.user);
    res.status(HttpStatus.OK).json({ success: true, message: 'Lab updated', data: { lab } });
  });

  deleteLab = asyncHandler(async (req, res) => {
    const result = await this.labService.deleteLab(req.params.id, req.user);
    res.status(HttpStatus.OK).json({ success: true, ...result });
  });

  getTests = asyncHandler(async (req, res) => {
    const result = await this.labService.getTests(req.query, req.user);
    res.status(HttpStatus.OK).json({ success: true, data: result });
  });

  getTestById = asyncHandler(async (req, res) => {
    const test = await this.labService.getTestById(req.params.id);
    res.status(HttpStatus.OK).json({ success: true, data: { test } });
  });

  createTest = asyncHandler(async (req, res) => {
    const test = await this.labService.createTest(req.body, req.user);
    res.status(HttpStatus.CREATED).json({ success: true, message: 'Test created', data: { test } });
  });

  updateTest = asyncHandler(async (req, res) => {
    const test = await this.labService.updateTest(req.params.id, req.body, req.user);
    res.status(HttpStatus.OK).json({ success: true, message: 'Test updated', data: { test } });
  });

  deleteTest = asyncHandler(async (req, res) => {
    const result = await this.labService.deleteTest(req.params.id, req.user);
    res.status(HttpStatus.OK).json({ success: true, ...result });
  });

  getBookings = asyncHandler(async (req, res) => {
    const result = await this.labService.getBookings(req.query, req.user);
    res.status(HttpStatus.OK).json({ success: true, data: result });
  });

  getMyBookings = asyncHandler(async (req, res) => {
    const bookings = await this.labService.getMyBookings(req.user);
    res.status(HttpStatus.OK).json({ success: true, data: { bookings } });
  });

  getBookingById = asyncHandler(async (req, res) => {
    const booking = await this.labService.getBookingById(req.params.id, req.user);
    res.status(HttpStatus.OK).json({ success: true, data: { booking } });
  });

  createBooking = asyncHandler(async (req, res) => {
    const booking = await this.labService.createBooking(req.body, req.user);
    res.status(HttpStatus.CREATED).json({ success: true, message: 'Booking created', data: { booking } });
  });

  updateBookingStatus = asyncHandler(async (req, res) => {
    const booking = await this.labService.updateBookingStatus(req.params.id, req.body, req.user);
    res.status(HttpStatus.OK).json({ success: true, message: 'Booking updated', data: { booking } });
  });

  cancelBooking = asyncHandler(async (req, res) => {
    const booking = await this.labService.cancelBooking(req.params.id, req.body, req.user);
    res.status(HttpStatus.OK).json({ success: true, message: 'Booking cancelled', data: { booking } });
  });

  uploadReport = asyncHandler(async (req, res) => {
    const report = await this.labService.uploadReport(req.file, req.body, req.user);
    res.status(HttpStatus.CREATED).json({ success: true, message: 'Report uploaded', data: { report } });
  });

  getMyReports = asyncHandler(async (req, res) => {
    const reports = await this.labService.getMyReports(req.user);
    res.status(HttpStatus.OK).json({ success: true, data: { reports } });
  });

  getReports = asyncHandler(async (req, res) => {
    const result = await this.labService.getReports(req.query, req.user);
    res.status(HttpStatus.OK).json({ success: true, data: result });
  });

  getReportById = asyncHandler(async (req, res) => {
    const report = await this.labService.getReportById(req.params.id, req.user);
    res.status(HttpStatus.OK).json({ success: true, data: { report } });
  });

  downloadReport = asyncHandler(async (req, res) => {
    const file = await this.labService.downloadReport(req.params.id, req.user);
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${file.fileName}"`);
    res.send(file.buffer);
  });
}

module.exports = LabController;

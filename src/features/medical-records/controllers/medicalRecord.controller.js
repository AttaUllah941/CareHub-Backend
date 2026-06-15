const asyncHandler = require('../../../core/utils/asyncHandler');
const { HttpStatus } = require('../../../shared/constants/httpStatus.constants');

class MedicalRecordController {
  constructor(medicalRecordService) {
    this.medicalRecordService = medicalRecordService;
  }

  uploadRecord = asyncHandler(async (req, res) => {
    const record = await this.medicalRecordService.uploadRecord(req.file, req.body, req.user);
    res.status(HttpStatus.CREATED).json({
      success: true,
      message: 'Medical record uploaded successfully',
      data: { record },
    });
  });

  uploadNewVersion = asyncHandler(async (req, res) => {
    const record = await this.medicalRecordService.uploadNewVersion(
      req.params.id,
      req.file,
      req.body,
      req.user,
    );
    res.status(HttpStatus.OK).json({
      success: true,
      message: 'New version uploaded',
      data: { record },
    });
  });

  getMyRecords = asyncHandler(async (req, res) => {
    const records = await this.medicalRecordService.getMyRecords(req.user, {
      recordType: req.query.recordType,
    });
    res.status(HttpStatus.OK).json({ success: true, data: { records } });
  });

  getByPatientId = asyncHandler(async (req, res) => {
    const records = await this.medicalRecordService.getRecordsByPatientId(
      req.params.patientProfileId,
      req.user,
      { recordType: req.query.recordType },
    );
    res.status(HttpStatus.OK).json({ success: true, data: { records } });
  });

  getByConsultationId = asyncHandler(async (req, res) => {
    const records = await this.medicalRecordService.getRecordsByConsultationId(
      req.params.consultationId,
      req.user,
    );
    res.status(HttpStatus.OK).json({ success: true, data: { records } });
  });

  getRecordById = asyncHandler(async (req, res) => {
    const record = await this.medicalRecordService.getRecordById(req.params.id, req.user);
    res.status(HttpStatus.OK).json({ success: true, data: { record } });
  });

  getRecordHistory = asyncHandler(async (req, res) => {
    const history = await this.medicalRecordService.getRecordHistory(req.params.id, req.user);
    res.status(HttpStatus.OK).json({ success: true, data: history });
  });

  downloadRecord = asyncHandler(async (req, res) => {
    const version = req.query.version ? parseInt(req.query.version, 10) : undefined;
    const { buffer, originalFileName, mimeType } = await this.medicalRecordService.downloadRecord(
      req.params.id,
      req.user,
      { version },
    );
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${originalFileName}"`);
    res.status(HttpStatus.OK).send(buffer);
  });

  getRecords = asyncHandler(async (req, res) => {
    const result = await this.medicalRecordService.getRecords(req.query, req.user);
    res.status(HttpStatus.OK).json({ success: true, data: result });
  });

  updateRecord = asyncHandler(async (req, res) => {
    const record = await this.medicalRecordService.updateRecordMetadata(
      req.params.id,
      req.body,
      req.user,
    );
    res.status(HttpStatus.OK).json({
      success: true,
      message: 'Medical record updated',
      data: { record },
    });
  });

  deleteRecord = asyncHandler(async (req, res) => {
    const result = await this.medicalRecordService.deleteRecord(req.params.id, req.user);
    res.status(HttpStatus.OK).json({ success: true, message: result.message });
  });
}

module.exports = MedicalRecordController;

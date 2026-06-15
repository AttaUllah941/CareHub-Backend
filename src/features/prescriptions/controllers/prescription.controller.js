const asyncHandler = require('../../../core/utils/asyncHandler');
const { HttpStatus } = require('../../../shared/constants/httpStatus.constants');

class PrescriptionController {
  constructor(prescriptionService) {
    this.prescriptionService = prescriptionService;
  }

  getMyPrescriptions = asyncHandler(async (req, res) => {
    const prescriptions = await this.prescriptionService.getMyPrescriptions(req.user);
    res.status(HttpStatus.OK).json({ success: true, data: { prescriptions } });
  });

  getDoctorPrescriptions = asyncHandler(async (req, res) => {
    const prescriptions = await this.prescriptionService.getDoctorPrescriptions(req.user);
    res.status(HttpStatus.OK).json({ success: true, data: { prescriptions } });
  });

  getByConsultationId = asyncHandler(async (req, res) => {
    const prescription = await this.prescriptionService.getPrescriptionByConsultationId(
      req.params.consultationId,
      req.user,
    );
    res.status(HttpStatus.OK).json({ success: true, data: { prescription } });
  });

  createForConsultation = asyncHandler(async (req, res) => {
    const prescription = await this.prescriptionService.createPrescription(
      req.params.consultationId,
      req.body,
      req.user,
    );
    res.status(HttpStatus.CREATED).json({
      success: true,
      message: 'Prescription created successfully',
      data: { prescription },
    });
  });

  getPrescriptionById = asyncHandler(async (req, res) => {
    const prescription = await this.prescriptionService.getPrescriptionById(req.params.id, req.user);
    res.status(HttpStatus.OK).json({ success: true, data: { prescription } });
  });

  getPrescriptions = asyncHandler(async (req, res) => {
    const result = await this.prescriptionService.getPrescriptions(req.query, req.user);
    res.status(HttpStatus.OK).json({ success: true, data: result });
  });

  updatePrescription = asyncHandler(async (req, res) => {
    const prescription = await this.prescriptionService.updatePrescription(
      req.params.id,
      req.body,
      req.user,
    );
    res.status(HttpStatus.OK).json({
      success: true,
      message: 'Prescription updated',
      data: { prescription },
    });
  });

  deletePrescription = asyncHandler(async (req, res) => {
    const result = await this.prescriptionService.deletePrescription(req.params.id, req.user);
    res.status(HttpStatus.OK).json({ success: true, message: result.message });
  });

  downloadPdf = asyncHandler(async (req, res) => {
    const { buffer, filename } = await this.prescriptionService.generatePdf(req.params.id, req.user);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(HttpStatus.OK).send(buffer);
  });
}

module.exports = PrescriptionController;

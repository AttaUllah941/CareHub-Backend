const asyncHandler = require('../../../core/utils/asyncHandler');
const { HttpStatus } = require('../../../shared/constants/httpStatus.constants');

class ConsultationController {
  constructor(consultationService) {
    this.consultationService = consultationService;
  }

  getMyConsultations = asyncHandler(async (req, res) => {
    const consultations = await this.consultationService.getMyConsultations(req.user);
    res.status(HttpStatus.OK).json({ success: true, data: { consultations } });
  });

  getDoctorConsultations = asyncHandler(async (req, res) => {
    const consultations = await this.consultationService.getDoctorConsultations(req.user);
    res.status(HttpStatus.OK).json({ success: true, data: { consultations } });
  });

  getByAppointmentId = asyncHandler(async (req, res) => {
    const consultation = await this.consultationService.getConsultationByAppointmentId(
      req.params.appointmentId,
      req.user,
    );
    res.status(HttpStatus.OK).json({ success: true, data: { consultation } });
  });

  createForAppointment = asyncHandler(async (req, res) => {
    const consultation = await this.consultationService.createConsultation(
      req.params.appointmentId,
      req.body,
      req.user,
    );
    res.status(HttpStatus.CREATED).json({
      success: true,
      message: 'Consultation recorded successfully',
      data: { consultation },
    });
  });

  getConsultationById = asyncHandler(async (req, res) => {
    const consultation = await this.consultationService.getConsultationById(req.params.id, req.user);
    res.status(HttpStatus.OK).json({ success: true, data: { consultation } });
  });

  getConsultations = asyncHandler(async (req, res) => {
    const result = await this.consultationService.getConsultations(req.query, req.user);
    res.status(HttpStatus.OK).json({ success: true, data: result });
  });

  updateConsultation = asyncHandler(async (req, res) => {
    const consultation = await this.consultationService.updateConsultation(
      req.params.id,
      req.body,
      req.user,
    );
    res.status(HttpStatus.OK).json({
      success: true,
      message: 'Consultation updated',
      data: { consultation },
    });
  });

  deleteConsultation = asyncHandler(async (req, res) => {
    const result = await this.consultationService.deleteConsultation(req.params.id, req.user);
    res.status(HttpStatus.OK).json({ success: true, message: result.message });
  });
}

module.exports = ConsultationController;

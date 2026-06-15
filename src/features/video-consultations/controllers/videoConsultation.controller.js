const asyncHandler = require('../../../core/utils/asyncHandler');
const { HttpStatus } = require('../../../shared/constants/httpStatus.constants');

class VideoConsultationController {
  constructor(videoConsultationService) {
    this.videoConsultationService = videoConsultationService;
  }

  createOrJoin = asyncHandler(async (req, res) => {
    const result = await this.videoConsultationService.createOrJoinSession(
      req.params.appointmentId,
      req.user,
    );
    res.status(HttpStatus.OK).json({ success: true, data: result });
  });

  getSession = asyncHandler(async (req, res) => {
    const result = await this.videoConsultationService.getSession(req.params.id, req.user);
    res.status(HttpStatus.OK).json({ success: true, data: result });
  });

  getByAppointment = asyncHandler(async (req, res) => {
    const result = await this.videoConsultationService.getSessionByAppointment(
      req.params.appointmentId,
      req.user,
    );
    res.status(HttpStatus.OK).json({ success: true, data: result });
  });

  joinSession = asyncHandler(async (req, res) => {
    const result = await this.videoConsultationService.joinSession(req.params.id, req.user);
    res.status(HttpStatus.OK).json({ success: true, data: result });
  });

  endSession = asyncHandler(async (req, res) => {
    const session = await this.videoConsultationService.endSession(req.params.id, req.user);
    res.status(HttpStatus.OK).json({
      success: true,
      message: 'Video session ended',
      data: { session },
    });
  });

  getMessages = asyncHandler(async (req, res) => {
    const messages = await this.videoConsultationService.getMessages(req.params.id, req.user);
    res.status(HttpStatus.OK).json({ success: true, data: { messages } });
  });

  startRecording = asyncHandler(async (req, res) => {
    const result = await this.videoConsultationService.startRecording(req.params.id, req.user);
    res.status(HttpStatus.OK).json({
      success: true,
      message: 'Recording started',
      data: result,
    });
  });

  stopRecording = asyncHandler(async (req, res) => {
    const result = await this.videoConsultationService.stopRecording(
      req.params.id,
      req.user,
      req.body,
    );
    res.status(HttpStatus.OK).json({
      success: true,
      message: 'Recording stopped',
      data: result,
    });
  });
}

module.exports = VideoConsultationController;

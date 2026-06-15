const asyncHandler = require('../../../core/utils/asyncHandler');
const { HttpStatus } = require('../../../shared/constants/httpStatus.constants');

class AppointmentController {
  constructor(appointmentService) {
    this.appointmentService = appointmentService;
  }

  getAvailableSlots = asyncHandler(async (req, res) => {
    const result = await this.appointmentService.getAvailableSlots(
      req.query.doctorProfileId,
      req.query.date,
      req.user,
      { clinicId: req.query.clinicId ?? null },
    );
    res.status(HttpStatus.OK).json({ success: true, data: result });
  });

  getRecurringSlots = asyncHandler(async (req, res) => {
    const result = await this.appointmentService.getRecurringSlots(
      req.query.doctorProfileId,
      req.query.fromDate,
      req.query.toDate,
      req.user,
      {
        clinicId: req.query.clinicId ?? null,
        maxDays: req.query.maxDays ? parseInt(req.query.maxDays, 10) : undefined,
      },
    );
    res.status(HttpStatus.OK).json({ success: true, data: result });
  });

  getMyAppointments = asyncHandler(async (req, res) => {
    const appointments = await this.appointmentService.getMyAppointments(req.user, req.query);
    res.status(HttpStatus.OK).json({ success: true, data: { appointments } });
  });

  getDoctorAppointments = asyncHandler(async (req, res) => {
    const appointments = await this.appointmentService.getDoctorAppointments(req.user, req.query);
    res.status(HttpStatus.OK).json({ success: true, data: { appointments } });
  });

  bookAppointment = asyncHandler(async (req, res) => {
    const appointment = await this.appointmentService.bookAppointment(req.body, req.user);
    res.status(HttpStatus.CREATED).json({
      success: true,
      message: 'Appointment booked successfully',
      data: { appointment },
    });
  });

  getAppointmentById = asyncHandler(async (req, res) => {
    const appointment = await this.appointmentService.getAppointmentById(req.params.id, req.user);
    res.status(HttpStatus.OK).json({ success: true, data: { appointment } });
  });

  updateMyAppointment = asyncHandler(async (req, res) => {
    const appointment = await this.appointmentService.updateAppointment(req.params.id, req.body, req.user);
    res.status(HttpStatus.OK).json({
      success: true,
      message: 'Appointment updated',
      data: { appointment },
    });
  });

  cancelMyAppointment = asyncHandler(async (req, res) => {
    const appointment = await this.appointmentService.cancelAppointment(req.params.id, req.body, req.user);
    res.status(HttpStatus.OK).json({
      success: true,
      message: 'Appointment cancelled',
      data: { appointment },
    });
  });

  rescheduleMyAppointment = asyncHandler(async (req, res) => {
    const appointment = await this.appointmentService.rescheduleAppointment(
      req.params.id,
      req.body,
      req.user,
    );
    res.status(HttpStatus.OK).json({
      success: true,
      message: 'Appointment rescheduled',
      data: { appointment },
    });
  });

  updateDoctorAppointmentStatus = asyncHandler(async (req, res) => {
    const appointment = await this.appointmentService.updateAppointmentStatus(
      req.params.id,
      req.body,
      req.user,
    );
    res.status(HttpStatus.OK).json({
      success: true,
      message: 'Appointment status updated',
      data: { appointment },
    });
  });

  getAppointments = asyncHandler(async (req, res) => {
    const result = await this.appointmentService.getAppointments(req.query, req.user);
    res.status(HttpStatus.OK).json({ success: true, data: result });
  });

  updateAppointment = asyncHandler(async (req, res) => {
    const appointment = await this.appointmentService.updateAppointment(req.params.id, req.body, req.user);
    res.status(HttpStatus.OK).json({
      success: true,
      message: 'Appointment updated',
      data: { appointment },
    });
  });

  cancelAppointment = asyncHandler(async (req, res) => {
    const appointment = await this.appointmentService.cancelAppointment(req.params.id, req.body, req.user);
    res.status(HttpStatus.OK).json({
      success: true,
      message: 'Appointment cancelled',
      data: { appointment },
    });
  });

  rescheduleAppointment = asyncHandler(async (req, res) => {
    const appointment = await this.appointmentService.rescheduleAppointment(
      req.params.id,
      req.body,
      req.user,
    );
    res.status(HttpStatus.OK).json({
      success: true,
      message: 'Appointment rescheduled',
      data: { appointment },
    });
  });

  updateAppointmentStatus = asyncHandler(async (req, res) => {
    const appointment = await this.appointmentService.updateAppointmentStatus(
      req.params.id,
      req.body,
      req.user,
    );
    res.status(HttpStatus.OK).json({
      success: true,
      message: 'Appointment status updated',
      data: { appointment },
    });
  });
}

module.exports = AppointmentController;

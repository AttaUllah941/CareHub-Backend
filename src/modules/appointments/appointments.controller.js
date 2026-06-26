const { successResponse } = require('../../shared/utils/apiResponse');
const asyncHandler = require('../../shared/utils/asyncHandler');
const appointmentsService = require('./appointments.service');

const create = asyncHandler(async (req, res) => {
  const data = await appointmentsService.createAppointment(req.body, req.user);
  res.status(201).json(successResponse(data, 'Appointment booked successfully'));
});

const listMine = asyncHandler(async (req, res) => {
  const data = await appointmentsService.listMyPatientAppointments(req.user, req.query);
  res.status(200).json(successResponse(data, 'Appointments retrieved'));
});

const getById = asyncHandler(async (req, res) => {
  const doctor = await appointmentsService.resolveDoctorForAccess(req.user);
  const data = await appointmentsService.getAppointmentById(req.params.id, req.user, doctor);
  res.status(200).json(successResponse(data, 'Appointment retrieved'));
});

const cancel = asyncHandler(async (req, res) => {
  const data = await appointmentsService.cancelAppointment(req.params.id, req.user);
  res.status(200).json(successResponse(data, 'Appointment cancelled'));
});

const listDoctorAppointments = asyncHandler(async (req, res) => {
  const data = await appointmentsService.listDoctorAppointments(req.doctor, req.query);
  res.status(200).json(successResponse(data, 'Appointments retrieved'));
});

const confirm = asyncHandler(async (req, res) => {
  const data = await appointmentsService.confirmAppointment(req.params.id, req.doctor);
  res.status(200).json(successResponse(data, 'Appointment confirmed'));
});

const complete = asyncHandler(async (req, res) => {
  const data = await appointmentsService.completeAppointment(req.params.id, req.doctor);
  res.status(200).json(successResponse(data, 'Appointment completed'));
});

const reject = asyncHandler(async (req, res) => {
  const data = await appointmentsService.rejectAppointment(
    req.params.id,
    req.doctor,
    req.body.reason,
  );
  res.status(200).json(successResponse(data, 'Appointment rejected'));
});

module.exports = {
  create,
  listMine,
  getById,
  cancel,
  listDoctorAppointments,
  confirm,
  complete,
  reject,
};

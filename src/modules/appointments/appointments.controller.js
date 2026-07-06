const appointmentsService = require('./appointments.service');

const create = async (req, res) => {
  const result = await appointmentsService.createAppointment(req.body, req.user);
  res.status(201).json({ success: true, message: 'Appointment created', data: result });
};

const listMine = async (req, res) => {
  const result = await appointmentsService.listPatientAppointments(req.user, req.query);
  res.json({ success: true, message: 'Appointments retrieved', data: result });
};

const listDoctorAppointments = async (req, res) => {
  const result = await appointmentsService.listDoctorAppointments(req.user, req.query);
  res.json({ success: true, message: 'Appointments retrieved', data: result });
};

const confirm = async (req, res) => {
  const result = await appointmentsService.confirmAppointment(req.params.id, req.user);
  res.json({ success: true, message: 'Appointment confirmed', data: result });
};

const cancel = async (req, res) => {
  const result = await appointmentsService.cancelAppointment(req.params.id, req.user);
  res.json({ success: true, message: 'Appointment cancelled', data: result });
};

const complete = async (req, res) => {
  const result = await appointmentsService.completeAppointment(req.params.id, req.user);
  res.json({ success: true, message: 'Appointment completed', data: result });
};

const reject = async (req, res) => {
  const result = await appointmentsService.rejectAppointment(
    req.params.id,
    req.user,
    req.body.rejectionReason,
  );
  res.json({ success: true, message: 'Appointment rejected', data: result });
};

module.exports = {
  create,
  listMine,
  listDoctorAppointments,
  confirm,
  cancel,
  complete,
  reject,
};

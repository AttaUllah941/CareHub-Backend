const appointmentsService = require('./appointments.service');

const confirm = async (req, res) => {
  const result = await appointmentsService.confirmAppointment(req.params.id, req.user);
  res.json({ success: true, message: 'Appointment confirmed', data: result });
};

const cancel = async (req, res) => {
  const result = await appointmentsService.cancelAppointment(req.params.id, req.user);
  res.json({ success: true, message: 'Appointment cancelled', data: result });
};

module.exports = {
  confirm,
  cancel,
};

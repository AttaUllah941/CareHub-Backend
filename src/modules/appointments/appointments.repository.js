const mongoose = require('mongoose');
const { Appointment } = require('./appointments.model');

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const hasCompletedAppointment = (patientId, doctorId) =>
  Appointment.exists({
    patientId,
    doctorId,
    status: 'completed',
  });

const findById = (id) =>
  Appointment.findById(id)
    .populate('doctorId', 'fullName userId')
    .populate('patientId', 'firstName lastName email phone');

const findByBookingRef = (bookingRef) =>
  Appointment.findOne({ bookingRef })
    .populate('doctorId', 'fullName userId')
    .populate('patientId', 'firstName lastName email phone');

const updateById = (id, data) =>
  Appointment.findByIdAndUpdate(id, data, { new: true, runValidators: true })
    .populate('doctorId', 'fullName userId')
    .populate('patientId', 'firstName lastName email phone');

const create = (data) => Appointment.create(data);

const findByDoctorId = (doctorId, { skip = 0, limit = 20, sort = { scheduledAt: -1 }, status } = {}) => {
  const filter = { doctorId };
  if (status) {
    filter.status = status;
  }

  return Appointment.find(filter)
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .populate('doctorId', 'fullName userId')
    .populate('patientId', 'firstName lastName email phone');
};

const countByDoctorId = (doctorId, { status } = {}) => {
  const filter = { doctorId };
  if (status) {
    filter.status = status;
  }

  return Appointment.countDocuments(filter);
};

const findByPatientId = (patientId, { skip = 0, limit = 20, sort = { scheduledAt: -1 }, status } = {}) => {
  const filter = { patientId };
  if (status) {
    filter.status = status;
  }

  return Appointment.find(filter)
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .populate('doctorId', 'fullName userId')
    .populate('patientId', 'firstName lastName email phone');
};

const countByPatientId = (patientId, { status } = {}) => {
  const filter = { patientId };
  if (status) {
    filter.status = status;
  }

  return Appointment.countDocuments(filter);
};

module.exports = {
  isValidObjectId,
  hasCompletedAppointment,
  findById,
  findByBookingRef,
  create,
  updateById,
  findByDoctorId,
  countByDoctorId,
  findByPatientId,
  countByPatientId,
};

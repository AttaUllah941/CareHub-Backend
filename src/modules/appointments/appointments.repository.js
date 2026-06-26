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
    .populate('patientId', 'firstName lastName email');

const findByBookingRef = (bookingRef) =>
  Appointment.findOne({ bookingRef })
    .populate('doctorId', 'fullName userId')
    .populate('patientId', 'firstName lastName email');

const updateById = (id, data) =>
  Appointment.findByIdAndUpdate(id, data, { new: true, runValidators: true })
    .populate('doctorId', 'fullName userId')
    .populate('patientId', 'firstName lastName email');

module.exports = {
  isValidObjectId,
  hasCompletedAppointment,
  findById,
  findByBookingRef,
  updateById,
};

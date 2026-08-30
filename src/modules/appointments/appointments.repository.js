const mongoose = require('mongoose');
const { Appointment } = require('./appointments.model');

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const doctorPopulate = {
  path: 'doctorId',
  select: 'fullName userId',
  populate: { path: 'userId', select: 'email' },
};
const patientPopulate = { path: 'patientId', select: 'firstName lastName email phone' };

const withListPopulates = (query) =>
  query.populate(doctorPopulate).populate(patientPopulate).lean();

const hasCompletedAppointment = (patientId, doctorId) =>
  Appointment.exists({
    patientId,
    doctorId,
    status: 'completed',
  });

const findByPatientAndDoctor = (patientId, doctorId, { statuses } = {}) => {
  const filter = { patientId, doctorId };
  if (statuses?.length) {
    filter.status = { $in: statuses };
  }

  return Appointment.findOne(filter).lean();
};

const findById = (id) =>
  withListPopulates(Appointment.findById(id));

const findByBookingRef = (bookingRef) =>
  withListPopulates(Appointment.findOne({ bookingRef }));

const updateById = (id, data) =>
  withListPopulates(
    Appointment.findByIdAndUpdate(id, data, { new: true, runValidators: true }),
  );

const create = (data) => Appointment.create(data);

const findByDoctorId = (doctorId, { skip = 0, limit = 20, sort = { scheduledAt: -1 }, status } = {}) => {
  const filter = { doctorId };
  if (status) {
    filter.status = status;
  }

  return withListPopulates(
    Appointment.find(filter).sort(sort).skip(skip).limit(limit),
  );
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

  return withListPopulates(
    Appointment.find(filter).sort(sort).skip(skip).limit(limit),
  );
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
  findByPatientAndDoctor,
  findById,
  findByBookingRef,
  create,
  updateById,
  findByDoctorId,
  countByDoctorId,
  findByPatientId,
  countByPatientId,
};

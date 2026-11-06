const mongoose = require('mongoose');
const { Appointment, ACTIVE_STATUSES } = require('./appointments.model');

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

/** True when the doctor has an accepted (confirmed/completed) appointment with the patient. */
const hasCareRelationship = (patientId, doctorId) =>
  Appointment.exists({ patientId, doctorId, status: { $in: ['confirmed', 'completed'] } });

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

const findActiveSlot = (doctorId, scheduledAt) =>
  Appointment.findOne({
    doctorId,
    scheduledAt,
    status: { $in: ACTIVE_STATUSES },
  })
    .select('_id')
    .lean();

const updateById = (id, data) => {
  const update = { ...data };
  // Release the slot / pairing as soon as the appointment is no longer active.
  if (update.status && !ACTIVE_STATUSES.includes(update.status)) {
    update.$unset = { slotKey: 1, pairKey: 1 };
  }

  return withListPopulates(
    Appointment.findByIdAndUpdate(id, update, { new: true, runValidators: true }),
  );
};

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
  hasCareRelationship,
  findByPatientAndDoctor,
  findActiveSlot,
  findById,
  findByBookingRef,
  create,
  updateById,
  findByDoctorId,
  countByDoctorId,
  findByPatientId,
  countByPatientId,
};

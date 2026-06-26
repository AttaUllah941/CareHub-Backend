const mongoose = require('mongoose');
const { Appointment, BLOCKING_APPOINTMENT_STATUSES } = require('./appointments.model');

const POPULATE_DEFAULT = [
  { path: 'doctorId', select: 'fullName title city consultationFee currency userId' },
  { path: 'clinicId', select: 'name address city citySlug consultationFee' },
  { path: 'patientId', select: 'firstName lastName email phone' },
];

const findById = (id) => Appointment.findById(id).populate(POPULATE_DEFAULT);

const findBookedSlotsByDoctorAndDate = (doctorId, date) =>
  Appointment.find({
    doctorId,
    date,
    status: { $in: BLOCKING_APPOINTMENT_STATUSES },
  }).select('timeSlot consultationType clinicId status');

const existsBlockingSlot = (doctorId, date, timeSlot) =>
  Appointment.exists({
    doctorId,
    date,
    timeSlot,
    status: { $in: BLOCKING_APPOINTMENT_STATUSES },
  });

const create = (data, options = {}) => {
  const appointment = new Appointment(data);
  return appointment.save(options);
};

const findByPatient = (patientId, filter, { skip, limit, sort }) =>
  Appointment.find({ patientId, ...filter })
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .populate(POPULATE_DEFAULT);

const countByPatient = (patientId, filter) =>
  Appointment.countDocuments({ patientId, ...filter });

const findByDoctor = (doctorId, filter, { skip, limit, sort }) =>
  Appointment.find({ doctorId, ...filter })
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .populate(POPULATE_DEFAULT);

const countByDoctor = (doctorId, filter) =>
  Appointment.countDocuments({ doctorId, ...filter });

const updateById = (id, data, options = {}) =>
  Appointment.findByIdAndUpdate(id, data, { new: true, runValidators: true, ...options }).populate(
    POPULATE_DEFAULT,
  );

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

module.exports = {
  findById,
  findBookedSlotsByDoctorAndDate,
  existsBlockingSlot,
  create,
  findByPatient,
  countByPatient,
  findByDoctor,
  countByDoctor,
  updateById,
  isValidObjectId,
};

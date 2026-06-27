const mongoose = require('mongoose');
const { Prescription } = require('./prescriptions.model');

const findById = (id) => Prescription.findById(id);

const findByDoctorId = (doctorId, { skip, limit, sort }) =>
  Prescription.find({ doctorId })
    .sort(sort || { createdAt: -1 })
    .skip(skip)
    .limit(limit);

const findByPatientId = (patientId, { skip, limit, sort }) =>
  Prescription.find({ patientId })
    .populate('doctorId', 'fullName title')
    .sort(sort || { createdAt: -1 })
    .skip(skip)
    .limit(limit);

const countByDoctorId = (doctorId) => Prescription.countDocuments({ doctorId });

const countByPatientId = (patientId) => Prescription.countDocuments({ patientId });

const create = (data) => Prescription.create(data);

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

module.exports = {
  findById,
  findByDoctorId,
  findByPatientId,
  countByDoctorId,
  countByPatientId,
  create,
  isValidObjectId,
};

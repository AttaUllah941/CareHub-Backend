const mongoose = require('mongoose');
const Clinic = require('./clinics.model');

const findById = (id) => Clinic.findById(id);

const findActiveByDoctorId = (doctorId) =>
  Clinic.find({ doctorId, isActive: true }).sort({ name: 1 }).lean();

const findActiveByDoctorIds = (doctorIds) =>
  Clinic.find({ doctorId: { $in: doctorIds }, isActive: true }).sort({ name: 1 }).lean();

const create = (data) => Clinic.create(data);

const updateById = (id, data) =>
  Clinic.findByIdAndUpdate(id, data, { new: true, runValidators: true });

const softDeleteById = (id) =>
  Clinic.findByIdAndUpdate(id, { isActive: false }, { new: true });

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

module.exports = {
  findById,
  findActiveByDoctorId,
  findActiveByDoctorIds,
  create,
  updateById,
  softDeleteById,
  isValidObjectId,
};

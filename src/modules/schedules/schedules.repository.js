const mongoose = require('mongoose');
const { DoctorSchedule } = require('./schedules.model');

const findById = (id) => DoctorSchedule.findById(id);

const findByDoctorId = (doctorId) =>
  DoctorSchedule.find({ doctorId }).sort({ dayOfWeek: 1, specificDate: 1, startTime: 1 });

const findActiveForDoctorAndDate = (doctorId, dayOfWeek, dateString) =>
  DoctorSchedule.find({
    doctorId,
    isActive: true,
    $or: [{ dayOfWeek }, { specificDate: dateString }],
  });

const create = (data) => DoctorSchedule.create(data);

const updateById = (id, data) =>
  DoctorSchedule.findByIdAndUpdate(id, data, { new: true, runValidators: true });

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

module.exports = {
  findById,
  findByDoctorId,
  findActiveForDoctorAndDate,
  create,
  updateById,
  isValidObjectId,
};

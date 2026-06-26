const mongoose = require('mongoose');
const { DoctorApplication } = require('./doctor-applications.model');

const POPULATE_DEFAULT = [
  { path: 'userId', select: 'firstName lastName email phone role isActive' },
  { path: 'doctorId', select: 'fullName verificationStatus' },
  { path: 'reviewedBy', select: 'firstName lastName email' },
];

const findById = (id) => DoctorApplication.findById(id).populate(POPULATE_DEFAULT);

const findByEmail = (email) =>
  DoctorApplication.findOne({ email: email.toLowerCase() });

const findAll = (filter, { skip, limit, sort }) =>
  DoctorApplication.find(filter)
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .populate(POPULATE_DEFAULT);

const count = (filter) => DoctorApplication.countDocuments(filter);

const create = (data) => DoctorApplication.create(data);

const updateById = (id, data) =>
  DoctorApplication.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  }).populate(POPULATE_DEFAULT);

const deleteById = (id) => DoctorApplication.findByIdAndDelete(id);

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

module.exports = {
  findById,
  findByEmail,
  findAll,
  count,
  create,
  updateById,
  deleteById,
  isValidObjectId,
};

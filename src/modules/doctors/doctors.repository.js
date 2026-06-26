const mongoose = require('mongoose');
const { Doctor } = require('./doctors.model');
const User = require('../users/users.model');

const POPULATE_PUBLIC = [
  { path: 'specialtyIds', select: 'name slug description isActive' },
  { path: 'languageIds', select: 'name code isActive' },
  { path: 'userId', select: 'firstName lastName email phone isActive isEmailVerified role createdAt' },
];

const findUserById = (id) => User.findById(id);

const findById = (id) => Doctor.findById(id).populate(POPULATE_PUBLIC);

const findByUserId = (userId) => Doctor.findOne({ userId }).populate(POPULATE_PUBLIC);

const findVerifiedById = (id) =>
  Doctor.findOne({ _id: id, verificationStatus: 'VERIFIED' }).populate(POPULATE_PUBLIC);

const create = (data) => Doctor.create(data);

const updateById = (id, data) =>
  Doctor.findByIdAndUpdate(id, data, { new: true, runValidators: true }).populate(POPULATE_PUBLIC);

const updateByUserId = (userId, data) =>
  Doctor.findOneAndUpdate({ userId }, data, { new: true, runValidators: true }).populate(
    POPULATE_PUBLIC,
  );

const searchVerified = (filter, { skip, limit, sort }) =>
  Doctor.find({ ...filter, verificationStatus: 'VERIFIED' })
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .populate(POPULATE_PUBLIC);

const countVerified = (filter) =>
  Doctor.countDocuments({ ...filter, verificationStatus: 'VERIFIED' });

const searchAdmin = (filter, { skip, limit, sort }) =>
  Doctor.find(filter).sort(sort).skip(skip).limit(limit).populate(POPULATE_PUBLIC);

const countAdmin = (filter) => Doctor.countDocuments(filter);

const updateVerificationStatus = (id, data) =>
  Doctor.findByIdAndUpdate(id, data, { new: true, runValidators: true }).populate(POPULATE_PUBLIC);

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

module.exports = {
  findUserById,
  findById,
  findByUserId,
  findVerifiedById,
  create,
  updateById,
  updateByUserId,
  searchVerified,
  countVerified,
  searchAdmin,
  countAdmin,
  updateVerificationStatus,
  isValidObjectId,
};

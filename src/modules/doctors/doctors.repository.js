const mongoose = require('mongoose');
const { Doctor } = require('./doctors.model');
const usersRepository = require('../users/users.repository');

const userPopulate = {
  path: 'userId',
  select: 'firstName lastName email phone isActive isEmailVerified role createdAt',
};
const specialtyPopulate = {
  path: 'specialtyIds',
  select: 'name slug description icon isActive',
};
const languagePopulate = {
  path: 'languageIds',
  select: 'name code isActive',
};

const withPopulates = (query) =>
  query.populate(userPopulate).populate(specialtyPopulate).populate(languagePopulate);

const findById = (id) => withPopulates(Doctor.findById(id));

const findByUserId = (userId) => withPopulates(Doctor.findOne({ userId }));

const findUserById = (id) => usersRepository.findById(id);

const create = (data) => Doctor.create(data);

const updateById = (id, data) =>
  withPopulates(Doctor.findByIdAndUpdate(id, data, { new: true, runValidators: true }));

const updateByUserId = (userId, data) =>
  withPopulates(Doctor.findOneAndUpdate({ userId }, data, { new: true, runValidators: true }));

const updateVerificationStatus = (id, data) =>
  withPopulates(Doctor.findByIdAndUpdate(id, data, { new: true, runValidators: true }));

const deleteById = (id) => Doctor.findByIdAndDelete(id);

const updateRatingStats = (doctorId, { averageRating, reviewCount }) =>
  Doctor.findByIdAndUpdate(
    doctorId,
    { averageRating, reviewCount },
    { new: true, runValidators: true },
  );

const searchPublic = ({ filter, sort, skip, limit }) =>
  Promise.all([
    withPopulates(Doctor.find(filter)).sort(sort).skip(skip).limit(limit).lean(),
    Doctor.countDocuments(filter),
  ]);

const findVerifiedById = (id) =>
  withPopulates(
    Doctor.findOne({ _id: id, verificationStatus: 'VERIFIED', isActive: true }),
  ).lean();

const searchAdmin = ({ filter, sort, skip, limit }) =>
  Promise.all([
    withPopulates(Doctor.find(filter)).sort(sort).skip(skip).limit(limit),
    Doctor.countDocuments(filter),
  ]);

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

module.exports = {
  findById,
  findByUserId,
  findUserById,
  create,
  updateById,
  updateByUserId,
  updateVerificationStatus,
  deleteById,
  updateRatingStats,
  searchPublic,
  findVerifiedById,
  searchAdmin,
  isValidObjectId,
};

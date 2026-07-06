const mongoose = require('mongoose');
const { Doctor } = require('./doctors.model');
const usersRepository = require('../users/users.repository');

const userPopulate = { path: 'userId', select: 'firstName lastName email phone isActive isEmailVerified role createdAt' };
const specialtyPopulate = { path: 'specialtyIds', select: 'name slug description isActive' };
const languagePopulate = { path: 'languageIds', select: 'name code isActive' };

const findById = (id) =>
  Doctor.findById(id).populate(userPopulate).populate(specialtyPopulate).populate(languagePopulate);

const findByUserId = (userId) =>
  Doctor.findOne({ userId })
    .populate(userPopulate)
    .populate(specialtyPopulate)
    .populate(languagePopulate);

const findUserById = (id) => usersRepository.findById(id);

const create = (data) => Doctor.create(data);

const updateById = (id, data) =>
  Doctor.findByIdAndUpdate(id, data, { new: true, runValidators: true })
    .populate(userPopulate)
    .populate(specialtyPopulate)
    .populate(languagePopulate);

const updateByUserId = (userId, data) =>
  Doctor.findOneAndUpdate({ userId }, data, { new: true, runValidators: true })
    .populate(userPopulate)
    .populate(specialtyPopulate)
    .populate(languagePopulate);

const deleteById = (id) => Doctor.findByIdAndDelete(id);

const updateRatingStats = (doctorId, { averageRating, reviewCount }) =>
  Doctor.findByIdAndUpdate(
    doctorId,
    { averageRating, reviewCount },
    { new: true, runValidators: true },
  );

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

const findVerifiedById = (id) =>
  Doctor.findOne({ _id: id, verificationStatus: 'VERIFIED' })
    .populate(userPopulate)
    .populate(specialtyPopulate)
    .populate(languagePopulate);

const searchVerified = (filter, { skip, limit, sort }) =>
  Doctor.find({ ...filter, verificationStatus: 'VERIFIED' })
    .populate(userPopulate)
    .populate(specialtyPopulate)
    .populate(languagePopulate)
    .sort(sort)
    .skip(skip)
    .limit(limit);

const countVerified = (filter) =>
  Doctor.countDocuments({ ...filter, verificationStatus: 'VERIFIED' });

const searchAdmin = (filter, { skip, limit, sort }) =>
  Doctor.find(filter)
    .populate(userPopulate)
    .populate(specialtyPopulate)
    .populate(languagePopulate)
    .sort(sort)
    .skip(skip)
    .limit(limit);

const countAdmin = (filter) => Doctor.countDocuments(filter);

module.exports = {
  findById,
  findByUserId,
  findUserById,
  findVerifiedById,
  create,
  updateById,
  updateByUserId,
  deleteById,
  updateRatingStats,
  searchVerified,
  countVerified,
  searchAdmin,
  countAdmin,
  isValidObjectId,
};

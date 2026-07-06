const mongoose = require('mongoose');
const { Doctor } = require('./doctors.model');

const findById = (id) => Doctor.findById(id);

const create = (data) => Doctor.create(data);

const updateById = (id, data) =>
  Doctor.findByIdAndUpdate(id, data, { new: true, runValidators: true });

const deleteById = (id) => Doctor.findByIdAndDelete(id);

const updateRatingStats = (doctorId, { averageRating, reviewCount }) =>
  Doctor.findByIdAndUpdate(
    doctorId,
    { averageRating, reviewCount },
    { new: true, runValidators: true },
  );

const searchVerified = ({ filter, sort, skip, limit }) =>
  Promise.all([
    Doctor.find(filter).sort(sort).skip(skip).limit(limit).lean(),
    Doctor.countDocuments(filter),
  ]);

const findVerifiedById = (id) =>
  Doctor.findOne({ _id: id, verificationStatus: 'VERIFIED', isActive: true }).lean();

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

module.exports = {
  findById,
  create,
  updateById,
  deleteById,
  updateRatingStats,
  searchVerified,
  findVerifiedById,
  isValidObjectId,
};

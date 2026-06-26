const mongoose = require('mongoose');
const { Review } = require('./reviews.model');

const findById = (id) => Review.findById(id);

const findByDoctor = (doctorId, { skip, limit, sort }) =>
  Review.find({ doctorId }).sort(sort).skip(skip).limit(limit);

const countByDoctor = (doctorId) => Review.countDocuments({ doctorId });

const create = (data) => Review.create(data);

const updateById = (id, data) =>
  Review.findByIdAndUpdate(id, data, { new: true, runValidators: true });

const deleteById = (id) => Review.findByIdAndDelete(id);

const aggregateDoctorStats = async (doctorId) => {
  const [result] = await Review.aggregate([
    { $match: { doctorId: new mongoose.Types.ObjectId(doctorId) } },
    {
      $group: {
        _id: null,
        averageRating: { $avg: '$rating' },
        reviewCount: { $sum: 1 },
      },
    },
  ]);

  if (!result) {
    return { averageRating: 0, reviewCount: 0 };
  }

  return {
    averageRating: Math.round(result.averageRating * 10) / 10,
    reviewCount: result.reviewCount,
  };
};

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

module.exports = {
  findById,
  findByDoctor,
  countByDoctor,
  create,
  updateById,
  deleteById,
  aggregateDoctorStats,
  isValidObjectId,
};

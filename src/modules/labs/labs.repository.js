const mongoose = require('mongoose');
const { Lab } = require('./labs.model');

const findById = (id, { includeInactive = false } = {}) => {
  const filter = { _id: id };
  if (!includeInactive) {
    filter.isActive = true;
  }
  return Lab.findOne(filter);
};

const findByIdAdmin = (id) => Lab.findById(id);

const findPublic = (filter, { skip, limit, sort }) =>
  Lab.find({ ...filter, isActive: true }).sort(sort).skip(skip).limit(limit);

const countPublic = (filter) => Lab.countDocuments({ ...filter, isActive: true });

const create = (data) => Lab.create(data);

const updateById = (id, data) =>
  Lab.findByIdAndUpdate(id, data, { new: true, runValidators: true });

const softDeleteById = (id) =>
  Lab.findByIdAndUpdate(id, { isActive: false }, { new: true, runValidators: true });

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

module.exports = {
  findById,
  findByIdAdmin,
  findPublic,
  countPublic,
  create,
  updateById,
  softDeleteById,
  isValidObjectId,
};

const mongoose = require('mongoose');
const { Pharmacy } = require('./pharmacies.model');

const findById = (id, { includeInactive = false } = {}) => {
  const filter = { _id: id };
  if (!includeInactive) {
    filter.isActive = true;
  }
  return Pharmacy.findOne(filter);
};

const findByIdAdmin = (id) => Pharmacy.findById(id);

const findPublic = (filter, { skip, limit, sort }) =>
  Pharmacy.find({ ...filter, isActive: true }).sort(sort).skip(skip).limit(limit);

const countPublic = (filter) => Pharmacy.countDocuments({ ...filter, isActive: true });

const create = (data) => Pharmacy.create(data);

const updateById = (id, data) =>
  Pharmacy.findByIdAndUpdate(id, data, { new: true, runValidators: true });

const softDeleteById = (id) =>
  Pharmacy.findByIdAndUpdate(id, { isActive: false }, { new: true, runValidators: true });

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

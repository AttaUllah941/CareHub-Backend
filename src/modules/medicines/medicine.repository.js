const mongoose = require('mongoose');
const { Medicine } = require('./medicine.model');

const PHARMACY_POPULATE = { path: 'pharmacyId', select: 'name slug city citySlug address' };

const findById = (id, { includeInactive = false } = {}) => {
  const filter = { _id: id };
  if (!includeInactive) {
    filter.isActive = true;
  }
  return Medicine.findOne(filter).populate(PHARMACY_POPULATE);
};

const findByIdAdmin = (id) => Medicine.findById(id).populate(PHARMACY_POPULATE);

const findByIdAndPharmacy = (id, pharmacyId, { includeInactive = false } = {}) => {
  const filter = { _id: id, pharmacyId };
  if (!includeInactive) {
    filter.isActive = true;
  }
  return Medicine.findOne(filter);
};

const findPublic = (filter, { skip, limit, sort }) =>
  Medicine.find({ ...filter, isActive: true })
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .populate(PHARMACY_POPULATE);

const countPublic = (filter) => Medicine.countDocuments({ ...filter, isActive: true });

const findActiveByIds = (ids) =>
  Medicine.find({ _id: { $in: ids }, isActive: true });

const decrementStock = (id, quantity) =>
  Medicine.findOneAndUpdate(
    { _id: id, stock: { $gte: quantity } },
    { $inc: { stock: -quantity } },
    { new: true },
  );

const incrementStock = (id, quantity) =>
  Medicine.findByIdAndUpdate(id, { $inc: { stock: quantity } }, { new: true });

const create = (data) => Medicine.create(data);

const updateById = (id, data) =>
  Medicine.findByIdAndUpdate(id, data, { new: true, runValidators: true });

const softDeleteById = (id) =>
  Medicine.findByIdAndUpdate(id, { isActive: false }, { new: true, runValidators: true });

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

module.exports = {
  findById,
  findByIdAdmin,
  findByIdAndPharmacy,
  findPublic,
  countPublic,
  findActiveByIds,
  decrementStock,
  incrementStock,
  create,
  updateById,
  softDeleteById,
  isValidObjectId,
};

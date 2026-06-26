const mongoose = require('mongoose');
const { SurgeryProcedure } = require('./surgery-procedures.model');

const findBySlug = (slug) =>
  SurgeryProcedure.findOne({ slug: slug.toLowerCase(), isActive: true });

const findById = (id, { includeInactive = false } = {}) => {
  const filter = { _id: id };
  if (!includeInactive) {
    filter.isActive = true;
  }
  return SurgeryProcedure.findOne(filter);
};

const findByIdAdmin = (id) => SurgeryProcedure.findById(id);

const findPublic = (filter, { skip, limit, sort }) =>
  SurgeryProcedure.find({ ...filter, isActive: true }).sort(sort).skip(skip).limit(limit);

const countPublic = (filter) =>
  SurgeryProcedure.countDocuments({ ...filter, isActive: true });

const countActiveByHospital = (hospitalId) =>
  SurgeryProcedure.countDocuments({ hospitalIds: hospitalId, isActive: true });

const create = (data) => SurgeryProcedure.create(data);

const updateById = (id, data) =>
  SurgeryProcedure.findByIdAndUpdate(id, data, { new: true, runValidators: true });

const softDeleteById = (id) =>
  SurgeryProcedure.findByIdAndUpdate(id, { isActive: false }, { new: true, runValidators: true });

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

module.exports = {
  findBySlug,
  findById,
  findByIdAdmin,
  findPublic,
  countPublic,
  countActiveByHospital,
  create,
  updateById,
  softDeleteById,
  isValidObjectId,
};

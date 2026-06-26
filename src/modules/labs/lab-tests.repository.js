const mongoose = require('mongoose');
const { LabTest } = require('./lab-tests.model');

const findById = (id, { includeInactive = false } = {}) => {
  const filter = { _id: id };
  if (!includeInactive) {
    filter.isActive = true;
  }
  return LabTest.findOne(filter);
};

const findByIdAndLab = (id, labId, { includeInactive = false } = {}) => {
  const filter = { _id: id, labId };
  if (!includeInactive) {
    filter.isActive = true;
  }
  return LabTest.findOne(filter);
};

const findByLab = (labId, filter, { skip, limit, sort }) =>
  LabTest.find({ labId, isActive: true, ...filter }).sort(sort).skip(skip).limit(limit);

const countByLab = (labId, filter) =>
  LabTest.countDocuments({ labId, isActive: true, ...filter });

const findActiveByIdsForLab = (labId, testIds) =>
  LabTest.find({
    _id: { $in: testIds },
    labId,
    isActive: true,
  });

const create = (data) => LabTest.create(data);

const updateById = (id, data) =>
  LabTest.findByIdAndUpdate(id, data, { new: true, runValidators: true });

const softDeleteById = (id) =>
  LabTest.findByIdAndUpdate(id, { isActive: false }, { new: true, runValidators: true });

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

module.exports = {
  findById,
  findByIdAndLab,
  findByLab,
  countByLab,
  findActiveByIdsForLab,
  create,
  updateById,
  softDeleteById,
  isValidObjectId,
};

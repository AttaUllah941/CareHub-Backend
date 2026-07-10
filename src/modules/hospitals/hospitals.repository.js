const mongoose = require('mongoose');
const { Hospital } = require('./hospitals.model');

const DOCTOR_POPULATE_FIELDS = 'fullName verificationStatus averageRating reviewCount';

const findById = (id, { includeInactive = false } = {}) => {
  const filter = { _id: id };
  if (!includeInactive) {
    filter.isActive = true;
  }

  return Hospital.findOne(filter).populate('doctorIds', DOCTOR_POPULATE_FIELDS);
};

const findByIdAdmin = (id) =>
  Hospital.findById(id).populate('doctorIds', DOCTOR_POPULATE_FIELDS);

const findByCitySlugAndSlug = (citySlug, slug) =>
  Hospital.findOne({ citySlug, slug, isActive: true }).populate(
    'doctorIds',
    DOCTOR_POPULATE_FIELDS,
  );

const findPublic = (filter, { skip, limit, sort }) =>
  Hospital.find({ ...filter, isActive: true }).sort(sort).skip(skip).limit(limit);

const countPublic = (filter) => Hospital.countDocuments({ ...filter, isActive: true });

const create = (data) => Hospital.create(data);

const updateById = (id, data) =>
  Hospital.findByIdAndUpdate(id, data, { new: true, runValidators: true }).populate(
    'doctorIds',
    DOCTOR_POPULATE_FIELDS,
  );

const softDeleteById = (id) =>
  Hospital.findByIdAndUpdate(id, { isActive: false }, { new: true, runValidators: true });

const addDoctor = (id, doctorId) =>
  Hospital.findByIdAndUpdate(
    id,
    { $addToSet: { doctorIds: doctorId } },
    { new: true, runValidators: true },
  ).populate('doctorIds', DOCTOR_POPULATE_FIELDS);

const removeDoctor = (id, doctorId) =>
  Hospital.findByIdAndUpdate(
    id,
    { $pull: { doctorIds: doctorId } },
    { new: true, runValidators: true },
  ).populate('doctorIds', DOCTOR_POPULATE_FIELDS);

const findActiveByDoctorId = (doctorId) =>
  Hospital.find({ doctorIds: doctorId, isActive: true })
    .select('name address city citySlug doctorIds')
    .sort({ name: 1 });

const findActiveByDoctorIds = (doctorIds) =>
  Hospital.find({ doctorIds: { $in: doctorIds }, isActive: true })
    .select('name address city citySlug doctorIds')
    .sort({ name: 1 });

const findActiveByIds = (ids) =>
  Hospital.find({ _id: { $in: ids }, isActive: true }).select(
    'name slug city citySlug address rating offersSurgeries',
  );

const updateOffersSurgeries = (id, offersSurgeries) =>
  Hospital.findByIdAndUpdate(id, { offersSurgeries }, { new: true });

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

module.exports = {
  findById,
  findByIdAdmin,
  findByCitySlugAndSlug,
  findPublic,
  countPublic,
  create,
  updateById,
  softDeleteById,
  addDoctor,
  removeDoctor,
  findActiveByDoctorId,
  findActiveByDoctorIds,
  findActiveByIds,
  updateOffersSurgeries,
  isValidObjectId,
};

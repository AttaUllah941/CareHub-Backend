const mongoose = require('mongoose');
const { LabBooking } = require('./lab-bookings.model');

const POPULATE_DEFAULT = [
  { path: 'labId', select: 'name slug city citySlug address' },
  { path: 'testIds', select: 'name description price currency homeCollectionAvailable' },
  { path: 'patientId', select: 'firstName lastName email phone' },
];

const findById = (id) => LabBooking.findById(id).populate(POPULATE_DEFAULT);

const findByPatient = (patientId, filter, { skip, limit, sort }) =>
  LabBooking.find({ patientId, ...filter })
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .populate(POPULATE_DEFAULT);

const countByPatient = (patientId, filter) =>
  LabBooking.countDocuments({ patientId, ...filter });

const create = (data) => LabBooking.create(data);

const updateById = (id, data) =>
  LabBooking.findByIdAndUpdate(id, data, { new: true, runValidators: true }).populate(
    POPULATE_DEFAULT,
  );

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

module.exports = {
  findById,
  findByPatient,
  countByPatient,
  create,
  updateById,
  isValidObjectId,
};

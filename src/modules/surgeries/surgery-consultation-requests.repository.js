const mongoose = require('mongoose');
const { SurgeryConsultationRequest } = require('./surgery-consultation-requests.model');

const POPULATE_DEFAULT = [
  { path: 'procedureId', select: 'name slug category estimatedCostRange currency' },
  { path: 'hospitalId', select: 'name slug city citySlug address rating' },
  { path: 'patientId', select: 'firstName lastName email phone' },
];

const findById = (id) =>
  SurgeryConsultationRequest.findById(id).populate(POPULATE_DEFAULT);

const findByPatient = (patientId, filter, { skip, limit, sort }) =>
  SurgeryConsultationRequest.find({ patientId, ...filter })
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .populate(POPULATE_DEFAULT);

const countByPatient = (patientId, filter) =>
  SurgeryConsultationRequest.countDocuments({ patientId, ...filter });

const findAll = (filter, { skip, limit, sort }) =>
  SurgeryConsultationRequest.find(filter)
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .populate(POPULATE_DEFAULT);

const count = (filter) => SurgeryConsultationRequest.countDocuments(filter);

const create = (data) => SurgeryConsultationRequest.create(data);

const updateById = (id, data) =>
  SurgeryConsultationRequest.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  }).populate(POPULATE_DEFAULT);

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

module.exports = {
  findById,
  findByPatient,
  countByPatient,
  findAll,
  count,
  create,
  updateById,
  isValidObjectId,
};

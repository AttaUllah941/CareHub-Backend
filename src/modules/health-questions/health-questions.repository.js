const { HealthQuestion } = require('./health-questions.model');

const create = (data) => HealthQuestion.create(data);

const findById = (id) =>
  HealthQuestion.findById(id).lean();

const findAnsweredPublic = ({ filter, skip, limit, sort }) =>
  HealthQuestion.find(filter)
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .lean();

const countAnsweredPublic = (filter) => HealthQuestion.countDocuments(filter);

const findByPatientId = ({ patientId, skip, limit, sort }) =>
  HealthQuestion.find({ patientId })
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .lean();

const countByPatientId = (patientId) =>
  HealthQuestion.countDocuments({ patientId });

const isValidObjectId = (id) => {
  const mongoose = require('mongoose');
  return mongoose.Types.ObjectId.isValid(id);
};

module.exports = {
  create,
  findById,
  findAnsweredPublic,
  countAnsweredPublic,
  findByPatientId,
  countByPatientId,
  isValidObjectId,
};

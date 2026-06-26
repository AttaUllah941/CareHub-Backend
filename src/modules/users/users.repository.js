const mongoose = require('mongoose');
const { User } = require('./users.model');

const findByEmail = (email) => User.findOne({ email: email.toLowerCase() });

const findById = (id) => User.findById(id);

const findAll = (filter, { skip, limit, sort }) =>
  User.find(filter).sort(sort).skip(skip).limit(limit).select('-passwordHash');

const count = (filter) => User.countDocuments(filter);

const create = (data) => User.create(data);

const updateById = (id, data) =>
  User.findByIdAndUpdate(id, data, { new: true, runValidators: true }).select('-passwordHash');

const deleteById = (id) => User.findByIdAndDelete(id);

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

module.exports = {
  findByEmail,
  findById,
  findAll,
  count,
  create,
  updateById,
  deleteById,
  isValidObjectId,
};

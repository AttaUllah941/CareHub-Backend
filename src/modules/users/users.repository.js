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

const findActiveByRoles = (roles, { skip = 0, limit = 100 } = {}) =>
  User.find({ role: { $in: roles }, isActive: true })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .select('_id email firstName');

module.exports = {
  findByEmail,
  findById,
  findAll,
  findActiveByRoles,
  count,
  create,
  updateById,
  deleteById,
  isValidObjectId,
};

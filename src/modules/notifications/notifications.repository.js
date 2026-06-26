const mongoose = require('mongoose');
const { Notification } = require('./notifications.model');

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const create = (data) => Notification.create(data);

const findById = (id) => Notification.findById(id);

const findByUser = (userId, { skip = 0, limit = 20, unreadOnly = false } = {}) => {
  const filter = { userId };
  if (unreadOnly) {
    filter.isRead = false;
  }

  return Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit);
};

const countByUser = (userId, { unreadOnly = false } = {}) => {
  const filter = { userId };
  if (unreadOnly) {
    filter.isRead = false;
  }

  return Notification.countDocuments(filter);
};

const markAsRead = (id, userId) =>
  Notification.findOneAndUpdate(
    { _id: id, userId },
    { isRead: true },
    { new: true },
  );

module.exports = {
  isValidObjectId,
  create,
  findById,
  findByUser,
  countByUser,
  markAsRead,
};

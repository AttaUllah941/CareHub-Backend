const NotificationPreference = require('../models/notificationPreference.model');

class NotificationPreferenceRepository {
  async findByUserId(userId) {
    return NotificationPreference.findOne({ userId });
  }

  async findOrCreate(userId) {
    let prefs = await this.findByUserId(userId);
    if (!prefs) {
      prefs = await NotificationPreference.create({ userId });
    }
    return prefs;
  }

  async upsert(userId, data) {
    return NotificationPreference.findOneAndUpdate(
      { userId },
      { $set: data, $setOnInsert: { userId } },
      { new: true, upsert: true, runValidators: true },
    );
  }
}

module.exports = NotificationPreferenceRepository;

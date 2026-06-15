const SystemSettings = require('../models/systemSettings.model');
const {
  DEFAULT_GENERAL,
  DEFAULT_EMAIL,
  DEFAULT_SMS,
  DEFAULT_PAYMENT,
  DEFAULT_FEATURE_FLAGS,
} = require('../constants/settings.defaults');

class SettingsRepository {
  async getOrCreate() {
    let doc = await SystemSettings.findOne({ key: 'global' });
    if (!doc) {
      doc = await SystemSettings.create({
        key: 'global',
        general: DEFAULT_GENERAL,
        email: DEFAULT_EMAIL,
        sms: DEFAULT_SMS,
        payment: JSON.parse(JSON.stringify(DEFAULT_PAYMENT)),
        featureFlags: DEFAULT_FEATURE_FLAGS,
      });
    }
    return doc;
  }

  async updateSection(section, data, updatedByUserId) {
    const doc = await this.getOrCreate();
    doc[section] = data;
    if (updatedByUserId) doc.updatedByUserId = updatedByUserId;
    await doc.save();
    return doc.populate('updatedByUserId', 'firstName lastName email');
  }
}

module.exports = SettingsRepository;

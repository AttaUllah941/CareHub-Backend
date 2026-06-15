const { MASK } = require('../constants/settings.defaults');
const { AuditAction } = require('../../../shared/enums/auditAction.enum');

function getNested(obj, path) {
  return path.split('.').reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj);
}

function setNested(obj, path, value) {
  const keys = path.split('.');
  let current = obj;
  for (let i = 0; i < keys.length - 1; i += 1) {
    if (!current[keys[i]] || typeof current[keys[i]] !== 'object') current[keys[i]] = {};
    current = current[keys[i]];
  }
  current[keys[keys.length - 1]] = value;
}

function maskSettings(doc) {
  const json = doc.toJSON ? doc.toJSON() : { ...doc };
  const masked = JSON.parse(JSON.stringify(json));

  if (masked.email?.smtpPassword) masked.email.smtpPassword = MASK;
  if (masked.sms?.apiKey) masked.sms.apiKey = MASK;
  if (masked.sms?.apiSecret) masked.sms.apiSecret = MASK;
  if (masked.payment?.jazzcash?.password) masked.payment.jazzcash.password = MASK;
  if (masked.payment?.jazzcash?.integritySalt) masked.payment.jazzcash.integritySalt = MASK;
  if (masked.payment?.easypaisa?.hashKey) masked.payment.easypaisa.hashKey = MASK;

  return masked;
}

function mergeSecrets(existing, updates, secretPaths) {
  const merged = JSON.parse(JSON.stringify(updates));
  secretPaths.forEach((path) => {
    const newVal = getNested(merged, path);
    const oldVal = getNested(existing, path);
    if (!newVal || newVal === MASK) {
      setNested(merged, path, oldVal || '');
    }
  });
  return merged;
}

const EMAIL_SECRETS = ['email.smtpPassword'];
const SMS_SECRETS = ['sms.apiKey', 'sms.apiSecret'];
const PAYMENT_SECRETS = [
  'payment.jazzcash.password',
  'payment.jazzcash.integritySalt',
  'payment.easypaisa.hashKey',
];

class SettingsService {
  constructor(settingsRepository, auditService) {
    this.settingsRepository = settingsRepository;
    this.auditService = auditService;
  }

  async getSettings() {
    const doc = await this.settingsRepository.getOrCreate();
    return maskSettings(doc);
  }

  async getPublicSettings() {
    const doc = await this.settingsRepository.getOrCreate();
    const json = doc.toJSON();
    return {
      platformName: json.general?.platformName,
      maintenanceMode: json.general?.maintenanceMode ?? false,
      defaultCurrency: json.general?.defaultCurrency,
      featureFlags: json.featureFlags || {},
      onlinePaymentsEnabled: json.payment?.onlinePaymentsEnabled ?? true,
    };
  }

  async updateGeneral(data, requestedBy) {
    return this._updateSection('general', data, requestedBy);
  }

  async updateEmail(data, requestedBy) {
    const doc = await this.settingsRepository.getOrCreate();
    const merged = mergeSecrets(doc.toJSON(), { email: data }, EMAIL_SECRETS);
    return this._updateSection('email', merged.email, requestedBy);
  }

  async updateSms(data, requestedBy) {
    const doc = await this.settingsRepository.getOrCreate();
    const merged = mergeSecrets(doc.toJSON(), { sms: data }, SMS_SECRETS);
    return this._updateSection('sms', merged.sms, requestedBy);
  }

  async updatePayment(data, requestedBy) {
    const doc = await this.settingsRepository.getOrCreate();
    const existing = doc.toJSON();
    const payment = JSON.parse(JSON.stringify(data));
    if (payment.jazzcash) {
      payment.jazzcash = mergeSecrets(
        existing,
        { payment: { jazzcash: payment.jazzcash } },
        ['payment.jazzcash.password', 'payment.jazzcash.integritySalt'],
      ).payment.jazzcash;
    }
    if (payment.easypaisa) {
      payment.easypaisa = mergeSecrets(
        existing,
        { payment: { easypaisa: payment.easypaisa } },
        ['payment.easypaisa.hashKey'],
      ).payment.easypaisa;
    }
    return this._updateSection('payment', payment, requestedBy);
  }

  async updateFeatureFlags(data, requestedBy) {
    return this._updateSection('featureFlags', data, requestedBy);
  }

  async _updateSection(section, data, requestedBy) {
    const doc = await this.settingsRepository.getOrCreate();
    const before = maskSettings(doc);

    const updated = await this.settingsRepository.updateSection(
      section,
      data,
      requestedBy?.id,
    );

    await this.auditService?.log({
      action: AuditAction.UPDATE,
      module: 'settings',
      entityType: 'system-settings',
      entityId: updated._id?.toString(),
      entityLabel: section,
      description: `Updated ${section} settings`,
      requestedBy,
      metadata: { section, before: before[section], after: maskSettings(updated)[section] },
    });

    return maskSettings(updated);
  }
}

module.exports = SettingsService;

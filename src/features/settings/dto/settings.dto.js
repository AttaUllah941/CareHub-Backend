const { body } = require('express-validator');

const updateGeneralDto = [
  body('platformName').optional().trim().isLength({ max: 100 }),
  body('supportEmail').optional().trim().isEmail(),
  body('supportPhone').optional().trim().isLength({ max: 30 }),
  body('timezone').optional().trim().isLength({ max: 60 }),
  body('defaultCurrency').optional().trim().isLength({ max: 10 }),
  body('maintenanceMode').optional().isBoolean(),
  body('logoUrl').optional().trim().isLength({ max: 500 }),
];

const updateEmailDto = [
  body('enabled').optional().isBoolean(),
  body('provider').optional().isIn(['smtp', 'sendgrid', 'ses']),
  body('smtpHost').optional().trim(),
  body('smtpPort').optional().isInt({ min: 1, max: 65535 }),
  body('smtpSecure').optional().isBoolean(),
  body('smtpUser').optional().trim(),
  body('smtpPassword').optional().trim(),
  body('fromEmail').optional().trim().isEmail(),
  body('fromName').optional().trim().isLength({ max: 100 }),
];

const updateSmsDto = [
  body('enabled').optional().isBoolean(),
  body('provider').optional().isIn(['twilio', 'local', 'custom']),
  body('apiKey').optional().trim(),
  body('apiSecret').optional().trim(),
  body('senderId').optional().trim().isLength({ max: 20 }),
  body('baseUrl').optional().trim().isLength({ max: 300 }),
];

const updatePaymentDto = [
  body('defaultGateway').optional().isIn(['jazzcash', 'easypaisa']),
  body('onlinePaymentsEnabled').optional().isBoolean(),
  body('sandboxMode').optional().isBoolean(),
  body('jazzcash.enabled').optional().isBoolean(),
  body('jazzcash.merchantId').optional().trim(),
  body('jazzcash.password').optional().trim(),
  body('jazzcash.integritySalt').optional().trim(),
  body('jazzcash.returnUrl').optional().trim(),
  body('jazzcash.apiUrl').optional().trim(),
  body('easypaisa.enabled').optional().isBoolean(),
  body('easypaisa.storeId').optional().trim(),
  body('easypaisa.hashKey').optional().trim(),
  body('easypaisa.returnUrl').optional().trim(),
  body('easypaisa.apiUrl').optional().trim(),
];

const updateFeatureFlagsDto = [
  body('videoConsultation').optional().isBoolean(),
  body('pharmacy').optional().isBoolean(),
  body('lab').optional().isBoolean(),
  body('chat').optional().isBoolean(),
  body('onlinePayments').optional().isBoolean(),
  body('reviews').optional().isBoolean(),
  body('notifications').optional().isBoolean(),
  body('selfRegistration').optional().isBoolean(),
];

module.exports = {
  updateGeneralDto,
  updateEmailDto,
  updateSmsDto,
  updatePaymentDto,
  updateFeatureFlagsDto,
};

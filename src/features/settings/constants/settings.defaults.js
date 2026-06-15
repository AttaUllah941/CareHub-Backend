const DEFAULT_GENERAL = {
  platformName: 'CareHub',
  supportEmail: 'support@carehub.com',
  supportPhone: '+92-300-0000000',
  timezone: 'Asia/Karachi',
  defaultCurrency: 'PKR',
  maintenanceMode: false,
  logoUrl: '',
};

const DEFAULT_EMAIL = {
  enabled: false,
  provider: 'smtp',
  smtpHost: '',
  smtpPort: 587,
  smtpSecure: false,
  smtpUser: '',
  smtpPassword: '',
  fromEmail: 'noreply@carehub.com',
  fromName: 'CareHub',
};

const DEFAULT_SMS = {
  enabled: false,
  provider: 'twilio',
  apiKey: '',
  apiSecret: '',
  senderId: 'CareHub',
  baseUrl: '',
};

const DEFAULT_PAYMENT = {
  defaultGateway: 'jazzcash',
  onlinePaymentsEnabled: true,
  sandboxMode: true,
  jazzcash: {
    enabled: true,
    merchantId: '',
    password: '',
    integritySalt: '',
    returnUrl: '',
    apiUrl: 'https://sandbox.jazzcash.com.pk/ApplicationAPI/API/2.0/Purchase/DoMWalletTransaction',
  },
  easypaisa: {
    enabled: true,
    storeId: '',
    hashKey: '',
    returnUrl: '',
    apiUrl: 'https://easypay.easypaisa.com.pk/easypay-service/rest/v4/initiate-ma-transaction',
  },
};

const DEFAULT_FEATURE_FLAGS = {
  videoConsultation: true,
  pharmacy: true,
  lab: true,
  chat: true,
  onlinePayments: true,
  reviews: true,
  notifications: true,
  selfRegistration: true,
};

const MASK = '********';

const SECRET_PATHS = [
  'email.smtpPassword',
  'sms.apiKey',
  'sms.apiSecret',
  'payment.jazzcash.password',
  'payment.jazzcash.integritySalt',
  'payment.easypaisa.hashKey',
];

module.exports = {
  DEFAULT_GENERAL,
  DEFAULT_EMAIL,
  DEFAULT_SMS,
  DEFAULT_PAYMENT,
  DEFAULT_FEATURE_FLAGS,
  MASK,
  SECRET_PATHS,
};

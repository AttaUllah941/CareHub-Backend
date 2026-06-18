const crypto = require('crypto');
const config = require('../../../config');
const { PaymentGateway } = require('../../../shared/enums/paymentGateway.enum');

class EasyPaisaGatewayService {
  constructor() {
    this.gateway = PaymentGateway.EASYPAISA;
    this.cfg = config.payments.easypaisa;
  }

  _generateOrderId(paymentId) {
    return `EP-${paymentId}-${Date.now()}`;
  }

  _buildHash(fields) {
    const sorted = Object.keys(fields)
      .sort()
      .map((k) => `${fields[k]}`)
      .join('&');
    return crypto.createHmac('sha256', this.cfg.hashKey).update(sorted).digest('hex').toUpperCase();
  }

  async initiatePayment({ paymentId, amount, currency, description }) {
    const orderId = this._generateOrderId(paymentId);
    const fields = {
      storeId: this.cfg.storeId,
      orderId,
      transactionAmount: String(amount),
      transactionType: 'MA',
      mobileAccountNo: '',
      emailAddress: '',
      tokenExpiry: '',
      bankIdentificationNumber: '',
      encryptedHash: '',
      merchantHashedReq: '',
      paymentMethod: 'InitialRequest',
      postBackURL: this.cfg.returnUrl,
      signature: '',
      timestamp: new Date().toISOString(),
      amount: String(amount),
      orderRefNum: orderId,
      paymentMethodType: 'MA',
      description: description || 'CareHub Appointment Payment',
      currency: currency || 'PKR',
    };

    const hash = this._buildHash({ storeId: fields.storeId, orderId, amount: fields.amount });

    if (this.cfg.sandbox || !config.isProduction) {
      const redirectUrl = `${config.frontend.url}/patient/payments/callback/easypaisa?orderId=${orderId}&status=0000&hash=${hash}&paymentId=${paymentId}`;
      return {
        gatewayOrderId: orderId,
        redirectUrl,
        gatewayResponse: { ...fields, hash, sandbox: true },
      };
    }

    const redirectUrl = `${this.cfg.apiUrl}?orderId=${orderId}&hash=${hash}`;
    return { gatewayOrderId: orderId, redirectUrl, gatewayResponse: { ...fields, hash } };
  }

  verifyCallback(payload) {
    const status = payload.status || payload.responseCode;
    const success = status === '0000' || status === '00' || status === 'PAID';

    return {
      success,
      gatewayOrderId: payload.orderId || payload.orderRefNum,
      gatewayTransactionId: payload.transactionId || payload.orderId,
      response: payload,
      failureReason: success ? null : payload.responseMessage || 'Payment declined',
    };
  }

  async initiateRefund({ payment, amount, reason }) {
    const refundId = `EP-RF-${payment.id || payment._id}-${Date.now()}`;

    if (this.cfg.sandbox || !config.isProduction) {
      return {
        gatewayRefundId: refundId,
        status: 'SUCCEEDED',
        gatewayResponse: { sandbox: true, reason },
      };
    }

    return {
      gatewayRefundId: refundId,
      status: 'PROCESSING',
      gatewayResponse: { message: 'Refund queued with EasyPaisa' },
    };
  }
}

module.exports = EasyPaisaGatewayService;

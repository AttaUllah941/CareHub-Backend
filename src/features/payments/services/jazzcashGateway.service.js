const crypto = require('crypto');
const config = require('../../../config');
const logger = require('../../../core/utils/logger');
const { PaymentGateway } = require('../../../shared/enums/paymentGateway.enum');

class JazzCashGatewayService {
  constructor() {
    this.gateway = PaymentGateway.JAZZCASH;
    this.cfg = config.payments.jazzcash;
  }

  _generateOrderId(paymentId) {
    return `JC-${paymentId}-${Date.now()}`;
  }

  _buildSecureHash(fields) {
    const sorted = Object.keys(fields)
      .filter((k) => fields[k] !== '' && fields[k] !== null && fields[k] !== undefined)
      .sort()
      .map((k) => fields[k])
      .join('&');
    const payload = `${this.cfg.integritySalt}&${sorted}`;
    return crypto.createHmac('sha256', this.cfg.integritySalt).update(payload).digest('hex');
  }

  async initiatePayment({ paymentId, amount, currency, description }) {
    const orderId = this._generateOrderId(paymentId);
    const txnDateTime = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);

    const fields = {
      pp_Amount: String(Math.round(amount * 100)),
      pp_BillReference: `appt-${paymentId}`,
      pp_Description: description || 'CareHub Appointment Payment',
      pp_MerchantID: this.cfg.merchantId,
      pp_Password: this.cfg.password,
      pp_ReturnURL: this.cfg.returnUrl,
      pp_TxnCurrency: currency || 'PKR',
      pp_TxnDateTime: txnDateTime,
      pp_TxnRefNo: orderId,
      pp_TxnType: 'MWALLET',
      pp_Version: '1.1',
    };

    const secureHash = this._buildSecureHash(fields);

    if (this.cfg.sandbox || !config.isProduction) {
      const redirectUrl = `${config.frontend.url}/patient/payments/callback/jazzcash?pp_TxnRefNo=${orderId}&pp_ResponseCode=000&pp_SecureHash=${secureHash}&paymentId=${paymentId}`;
      logger.info(`[JazzCash DEV] Initiated payment ${orderId} amount ${amount} ${currency}`);
      return {
        gatewayOrderId: orderId,
        redirectUrl,
        gatewayResponse: { ...fields, pp_SecureHash: secureHash, sandbox: true },
      };
    }

    const redirectUrl = `${this.cfg.apiUrl}?${new URLSearchParams({ ...fields, pp_SecureHash: secureHash }).toString()}`;
    return { gatewayOrderId: orderId, redirectUrl, gatewayResponse: { ...fields, pp_SecureHash: secureHash } };
  }

  verifyCallback(payload) {
    const responseCode = payload.pp_ResponseCode || payload.responseCode;
    const success = responseCode === '000' || responseCode === '00';
    const receivedHash = payload.pp_SecureHash || payload.secureHash;

    if (receivedHash && this.cfg.integritySalt) {
      const { pp_SecureHash, secureHash, ...rest } = payload;
      const expected = this._buildSecureHash(rest);
      if (receivedHash !== expected && !this.cfg.sandbox) {
        return { success: false, error: 'Invalid secure hash' };
      }
    }

    return {
      success,
      gatewayOrderId: payload.pp_TxnRefNo || payload.txnRefNo,
      gatewayTransactionId: payload.pp_TxnRefNo || payload.txnRefNo,
      response: payload,
      failureReason: success ? null : payload.pp_ResponseMessage || 'Payment declined',
    };
  }

  async initiateRefund({ payment, amount, reason }) {
    const refundId = `JC-RF-${payment.id || payment._id}-${Date.now()}`;

    if (this.cfg.sandbox || !config.isProduction) {
      logger.info(`[JazzCash DEV] Refund ${refundId} for ${amount} ${payment.currency}`);
      return {
        gatewayRefundId: refundId,
        status: 'SUCCEEDED',
        gatewayResponse: { sandbox: true, reason },
      };
    }

    return {
      gatewayRefundId: refundId,
      status: 'PROCESSING',
      gatewayResponse: { message: 'Refund queued with JazzCash' },
    };
  }
}

module.exports = JazzCashGatewayService;

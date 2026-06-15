const { PaymentGateway } = require('../../../shared/enums/paymentGateway.enum');
const JazzCashGatewayService = require('./jazzcashGateway.service');
const EasyPaisaGatewayService = require('./easypaisaGateway.service');

class PaymentGatewayFactory {
  constructor() {
    this._gateways = {
      [PaymentGateway.JAZZCASH]: new JazzCashGatewayService(),
      [PaymentGateway.EASYPAISA]: new EasyPaisaGatewayService(),
    };
  }

  get(gateway) {
    const instance = this._gateways[gateway];
    if (!instance) throw new Error(`Unsupported payment gateway: ${gateway}`);
    return instance;
  }
}

module.exports = PaymentGatewayFactory;

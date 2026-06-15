const asyncHandler = require('../../../core/utils/asyncHandler');
const { HttpStatus } = require('../../../shared/constants/httpStatus.constants');

class PaymentController {
  constructor(paymentService) {
    this.paymentService = paymentService;
  }

  initiatePayment = asyncHandler(async (req, res) => {
    const payment = await this.paymentService.initiatePayment(
      req.params.appointmentId,
      req.body.gateway,
      req.user,
    );
    res.status(HttpStatus.CREATED).json({
      success: true,
      message: 'Payment initiated',
      data: { payment },
    });
  });

  jazzCashCallback = asyncHandler(async (req, res) => {
    const payment = await this.paymentService.handleGatewayCallback('JAZZCASH', {
      ...req.body,
      ...req.query,
    });
    res.status(HttpStatus.OK).json({ success: true, data: { payment } });
  });

  easyPaisaCallback = asyncHandler(async (req, res) => {
    const payment = await this.paymentService.handleGatewayCallback('EASYPAISA', {
      ...req.body,
      ...req.query,
    });
    res.status(HttpStatus.OK).json({ success: true, data: { payment } });
  });

  getMyPayments = asyncHandler(async (req, res) => {
    const result = await this.paymentService.getMyPayments(req.user, req.query);
    res.status(HttpStatus.OK).json({ success: true, data: result });
  });

  getByAppointmentId = asyncHandler(async (req, res) => {
    const payment = await this.paymentService.getPaymentByAppointmentId(
      req.params.appointmentId,
      req.user,
    );
    res.status(HttpStatus.OK).json({ success: true, data: { payment } });
  });

  getPaymentById = asyncHandler(async (req, res) => {
    const payment = await this.paymentService.getPaymentById(req.params.id, req.user);
    res.status(HttpStatus.OK).json({ success: true, data: { payment } });
  });

  verifyPayment = asyncHandler(async (req, res) => {
    const payment = await this.paymentService.verifyPayment(req.params.id, req.user);
    res.status(HttpStatus.OK).json({ success: true, data: { payment } });
  });

  initiateRefund = asyncHandler(async (req, res) => {
    const payment = await this.paymentService.initiateRefund(req.params.id, req.body, req.user);
    res.status(HttpStatus.OK).json({
      success: true,
      message: 'Refund initiated',
      data: { payment },
    });
  });

  getAllPayments = asyncHandler(async (req, res) => {
    const result = await this.paymentService.getAllPayments(req.query, req.user);
    res.status(HttpStatus.OK).json({ success: true, data: result });
  });
}

module.exports = PaymentController;

const crypto = require('crypto');
const {
  NotFoundError,
  ForbiddenError,
  BadRequestError,
  ConflictError,
} = require('../../../core/errors/AppError');
const { UserRole } = require('../../../shared/enums/userRole.enum');
const { PaymentStatus, AppointmentPaymentStatus } = require('../../../shared/enums/paymentStatus.enum');
const { PaymentGateway } = require('../../../shared/enums/paymentGateway.enum');
const { AppointmentStatus } = require('../../../shared/enums/appointmentStatus.enum');
const { RefundStatus } = require('../../../shared/enums/refundStatus.enum');
const {
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
} = require('../../../shared/constants/pagination.constants');

class PaymentService {
  constructor(
    paymentRepository,
    appointmentRepository,
    patientProfileRepository,
    paymentGatewayFactory,
    notificationService = null,
  ) {
    this.paymentRepository = paymentRepository;
    this.appointmentRepository = appointmentRepository;
    this.patientProfileRepository = patientProfileRepository;
    this.paymentGatewayFactory = paymentGatewayFactory;
    this.notificationService = notificationService;
  }

  _isAdmin(requestedBy) {
    return requestedBy && [UserRole.SUPER_ADMIN, UserRole.ADMIN].includes(requestedBy.role);
  }

  _format(payment) {
    const json = payment.toJSON ? payment.toJSON() : payment;
    const appointment = json.appointmentId;

    return {
      ...json,
      appointmentId:
        appointment?.id || appointment?._id?.toString() || json.appointmentId?.toString(),
      patientProfileId:
        json.patientProfileId?.id ||
        json.patientProfileId?._id?.toString() ||
        json.patientProfileId?.toString(),
      bookedByUserId:
        json.bookedByUserId?.id ||
        json.bookedByUserId?._id?.toString() ||
        json.bookedByUserId?.toString(),
      doctorProfileId:
        json.doctorProfileId?.id ||
        json.doctorProfileId?._id?.toString() ||
        json.doctorProfileId?.toString(),
      clinicId: json.clinicId?.id || json.clinicId?._id?.toString() || json.clinicId?.toString(),
      refundableAmount: Math.max(0, (json.amount || 0) - (json.refundAmount || 0)),
      appointment:
        appointment && typeof appointment === 'object'
          ? {
              id: appointment.id || appointment._id?.toString(),
              appointmentDate: appointment.appointmentDate,
              startTime: appointment.startTime,
              status: appointment.status,
              paymentStatus: appointment.paymentStatus,
              consultationFee: appointment.consultationFee,
              currency: appointment.currency,
              doctor: appointment.doctorProfileId
                ? {
                    id: appointment.doctorProfileId.id || appointment.doctorProfileId._id?.toString(),
                    title: appointment.doctorProfileId.title,
                    user: appointment.doctorProfileId.userId,
                  }
                : undefined,
              clinic: appointment.clinicId
                ? {
                    id: appointment.clinicId.id || appointment.clinicId._id?.toString(),
                    name: appointment.clinicId.name,
                  }
                : undefined,
            }
          : undefined,
    };
  }

  async _resolvePatientProfileByUser(userId) {
    const profile = await this.patientProfileRepository.findByUserId(userId);
    if (!profile) throw new NotFoundError('Patient profile not found');
    return profile;
  }

  async _syncAppointmentPayment(appointmentId, paymentStatus, paymentId = null) {
    const payload = { paymentStatus };
    if (paymentId) payload.paymentId = paymentId;
    await this.appointmentRepository.updateById(appointmentId, payload);
  }

  async initiatePayment(appointmentId, gateway, requestedBy) {
    if (!requestedBy || requestedBy.role !== UserRole.PATIENT) {
      throw new ForbiddenError('Only patients can initiate payments');
    }

    if (!Object.values(PaymentGateway).includes(gateway)) {
      throw new BadRequestError('Invalid payment gateway');
    }

    const appointment = await this.appointmentRepository.findById(appointmentId);
    if (!appointment || !appointment.isActive) throw new NotFoundError('Appointment not found');

    const profile = await this._resolvePatientProfileByUser(requestedBy.id);
    const patientId =
      appointment.patientProfileId?._id?.toString() || appointment.patientProfileId?.toString();
    if (patientId !== profile._id.toString()) {
      throw new ForbiddenError('You can only pay for your own appointments');
    }

    if (![AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED].includes(appointment.status)) {
      throw new BadRequestError('Payment is only allowed for pending or confirmed appointments');
    }

    const existing = await this.paymentRepository.findSucceededByAppointmentId(appointmentId);
    if (existing) throw new ConflictError('This appointment is already paid');

    const amount = appointment.consultationFee ?? 0;
    const currency = appointment.currency || 'PKR';

    if (amount <= 0) {
      await this._syncAppointmentPayment(appointmentId, AppointmentPaymentStatus.NOT_REQUIRED);
      throw new BadRequestError('No payment required for this appointment');
    }

    const idempotencyKey = crypto
      .createHash('sha256')
      .update(`${appointmentId}-${gateway}-${requestedBy.id}-${Date.now()}`)
      .digest('hex');

    const payment = await this.paymentRepository.create({
      appointmentId,
      patientProfileId: profile._id,
      bookedByUserId: requestedBy.id,
      doctorProfileId: appointment.doctorProfileId?._id || appointment.doctorProfileId,
      clinicId: appointment.clinicId?._id || appointment.clinicId,
      amount,
      currency,
      status: PaymentStatus.PENDING,
      gateway,
      idempotencyKey,
    });

    const gatewayService = this.paymentGatewayFactory.get(gateway);
    const result = await gatewayService.initiatePayment({
      paymentId: payment._id.toString(),
      amount,
      currency,
      description: `CareHub appointment ${appointmentId}`,
    });

    const updated = await this.paymentRepository.updateById(payment._id, {
      status: PaymentStatus.PROCESSING,
      gatewayOrderId: result.gatewayOrderId,
      redirectUrl: result.redirectUrl,
      gatewayResponse: result.gatewayResponse,
    });

    await this._syncAppointmentPayment(appointmentId, AppointmentPaymentStatus.PENDING, payment._id);

    return this._format(updated);
  }

  async _completePayment(payment, verifyResult) {
    if (payment.status === PaymentStatus.SUCCEEDED) {
      return this._format(payment);
    }

    if (!verifyResult.success) {
      const failed = await this.paymentRepository.updateById(payment._id, {
        status: PaymentStatus.FAILED,
        failedAt: new Date(),
        failureReason: verifyResult.failureReason || verifyResult.error || 'Payment failed',
        gatewayResponse: verifyResult.response,
      });
      await this._syncAppointmentPayment(
        payment.appointmentId?._id || payment.appointmentId,
        AppointmentPaymentStatus.FAILED,
      );
      return this._format(failed);
    }

    const succeeded = await this.paymentRepository.updateById(payment._id, {
      status: PaymentStatus.SUCCEEDED,
      gatewayTransactionId: verifyResult.gatewayTransactionId,
      gatewayResponse: verifyResult.response,
      paidAt: new Date(),
    });

    const appointmentId = succeeded.appointmentId?._id || succeeded.appointmentId;
    await this._syncAppointmentPayment(
      appointmentId,
      AppointmentPaymentStatus.PAID,
      succeeded._id,
    );

    const appointment = await this.appointmentRepository.findById(appointmentId);
    if (appointment?.status === AppointmentStatus.PENDING) {
      await this.appointmentRepository.updateById(appointmentId, {
        status: AppointmentStatus.CONFIRMED,
      });
      if (this.notificationService) {
        const refreshed = await this.appointmentRepository.findById(appointmentId);
        this.notificationService.notifyAppointmentConfirmed(refreshed);
      }
    }

    return this._format(succeeded);
  }

  async handleGatewayCallback(gateway, payload) {
    const gatewayService = this.paymentGatewayFactory.get(gateway);
    const verifyResult = gatewayService.verifyCallback(payload);

    let payment = null;
    if (payload.paymentId) {
      payment = await this.paymentRepository.findById(payload.paymentId);
    }
    if (!payment && verifyResult.gatewayOrderId) {
      payment = await this.paymentRepository.findByGatewayOrderId(gateway, verifyResult.gatewayOrderId);
    }
    if (!payment) throw new NotFoundError('Payment not found');

    return this._completePayment(payment, verifyResult);
  }

  async verifyPayment(paymentId, requestedBy) {
    const payment = await this.paymentRepository.findById(paymentId);
    if (!payment || !payment.isActive) throw new NotFoundError('Payment not found');

    const isOwner = payment.bookedByUserId?._id?.toString() === requestedBy?.id ||
      payment.bookedByUserId?.toString() === requestedBy?.id;
    if (!isOwner && !this._isAdmin(requestedBy)) {
      throw new ForbiddenError('Insufficient permissions');
    }

    return this._format(payment);
  }

  async getPaymentById(id, requestedBy) {
    const payment = await this.paymentRepository.findById(id);
    if (!payment || !payment.isActive) throw new NotFoundError('Payment not found');

    const isOwner = payment.bookedByUserId?._id?.toString() === requestedBy?.id ||
      payment.bookedByUserId?.toString() === requestedBy?.id;
    if (!isOwner && !this._isAdmin(requestedBy)) {
      throw new ForbiddenError('Insufficient permissions');
    }

    return this._format(payment);
  }

  async getPaymentByAppointmentId(appointmentId, requestedBy) {
    const appointment = await this.appointmentRepository.findById(appointmentId);
    if (!appointment) throw new NotFoundError('Appointment not found');

    if (requestedBy?.role === UserRole.PATIENT) {
      const profile = await this._resolvePatientProfileByUser(requestedBy.id);
      const patientId =
        appointment.patientProfileId?._id?.toString() || appointment.patientProfileId?.toString();
      if (patientId !== profile._id.toString()) {
        throw new ForbiddenError('Insufficient permissions');
      }
    } else if (!this._isAdmin(requestedBy) && requestedBy?.role !== UserRole.DOCTOR) {
      throw new ForbiddenError('Insufficient permissions');
    }

    const payment = await this.paymentRepository.findLatestByAppointmentId(appointmentId);
    if (!payment) throw new NotFoundError('No payment found for this appointment');
    return this._format(payment);
  }

  async getMyPayments(requestedBy, query) {
    if (!requestedBy) throw new ForbiddenError('Authentication required');

    const result = await this.paymentRepository.findByPatientUserId(requestedBy.id, {
      page: parseInt(query.page, 10) || DEFAULT_PAGE,
      limit: parseInt(query.limit, 10) || DEFAULT_LIMIT,
    });

    return {
      payments: result.payments.map((p) => this._format(p)),
      pagination: result.pagination,
    };
  }

  async getAllPayments(query, requestedBy) {
    if (!this._isAdmin(requestedBy)) throw new ForbiddenError('Insufficient permissions');

    const result = await this.paymentRepository.findAll({
      page: parseInt(query.page, 10) || DEFAULT_PAGE,
      limit: parseInt(query.limit, 10) || DEFAULT_LIMIT,
      status: query.status,
      gateway: query.gateway,
      search: query.search,
      patientProfileId: query.patientProfileId,
    });

    return {
      payments: result.payments.map((p) => this._format(p)),
      pagination: result.pagination,
    };
  }

  async initiateRefund(paymentId, data, requestedBy) {
    if (!this._isAdmin(requestedBy)) {
      throw new ForbiddenError('Only administrators can process refunds');
    }

    const payment = await this.paymentRepository.findById(paymentId);
    if (!payment || !payment.isActive) throw new NotFoundError('Payment not found');

    if (payment.status !== PaymentStatus.SUCCEEDED &&
        payment.status !== PaymentStatus.PARTIALLY_REFUNDED) {
      throw new BadRequestError('Only successful payments can be refunded');
    }

    const refundable = payment.amount - (payment.refundAmount || 0);
    const refundAmount = data.amount ?? refundable;

    if (refundAmount <= 0 || refundAmount > refundable) {
      throw new BadRequestError(`Invalid refund amount. Maximum refundable: ${refundable}`);
    }

    const gatewayService = this.paymentGatewayFactory.get(payment.gateway);
    const gatewayResult = await gatewayService.initiateRefund({
      payment: this._format(payment),
      amount: refundAmount,
      reason: data.reason,
    });

    const refundEntry = {
      amount: refundAmount,
      currency: payment.currency,
      status:
        gatewayResult.status === 'SUCCEEDED' ? RefundStatus.SUCCEEDED : RefundStatus.PROCESSING,
      reason: data.reason,
      gatewayRefundId: gatewayResult.gatewayRefundId,
      gatewayResponse: gatewayResult.gatewayResponse,
      initiatedByUserId: requestedBy.id,
      processedAt: gatewayResult.status === 'SUCCEEDED' ? new Date() : null,
    };

    const newRefundTotal = (payment.refundAmount || 0) + refundAmount;
    const newStatus =
      newRefundTotal >= payment.amount
        ? PaymentStatus.REFUNDED
        : PaymentStatus.PARTIALLY_REFUNDED;

    const updated = await this.paymentRepository.updateById(paymentId, {
      status: newStatus,
      refundAmount: newRefundTotal,
      refundedAt: gatewayResult.status === 'SUCCEEDED' ? new Date() : payment.refundedAt,
      refunds: [...(payment.refunds || []), refundEntry],
    });

    const appointmentId = payment.appointmentId?._id || payment.appointmentId;
    if (newStatus === PaymentStatus.REFUNDED) {
      await this._syncAppointmentPayment(appointmentId, AppointmentPaymentStatus.REFUNDED);
    }

    return this._format(updated);
  }
}

module.exports = PaymentService;

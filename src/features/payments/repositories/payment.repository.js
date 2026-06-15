const Payment = require('../models/payment.model');

const APPOINTMENT_POPULATE = [
  {
    path: 'patientProfileId',
    select: 'userId gender city',
    populate: { path: 'userId', select: 'firstName lastName email phone' },
  },
  {
    path: 'doctorProfileId',
    select: 'userId title',
    populate: { path: 'userId', select: 'firstName lastName email' },
  },
  { path: 'clinicId', select: 'name city address phone' },
  { path: 'familyMemberId', select: 'firstName lastName relationship' },
];

const POPULATE_FIELDS = [
  { path: 'appointmentId', populate: APPOINTMENT_POPULATE },
  { path: 'patientProfileId', select: 'userId', populate: { path: 'userId', select: 'firstName lastName email phone' } },
  { path: 'bookedByUserId', select: 'firstName lastName email' },
  { path: 'doctorProfileId', select: 'userId title', populate: { path: 'userId', select: 'firstName lastName' } },
  { path: 'clinicId', select: 'name city' },
  { path: 'refunds.initiatedByUserId', select: 'firstName lastName email' },
];

class PaymentRepository {
  async create(data) {
    const payment = await Payment.create(data);
    return payment.populate(POPULATE_FIELDS);
  }

  async findById(id) {
    return Payment.findById(id).populate(POPULATE_FIELDS);
  }

  async findByGatewayOrderId(gateway, gatewayOrderId) {
    return Payment.findOne({ gateway, gatewayOrderId, isActive: true }).populate(POPULATE_FIELDS);
  }

  async findLatestByAppointmentId(appointmentId) {
    return Payment.findOne({ appointmentId, isActive: true })
      .sort({ createdAt: -1 })
      .populate(POPULATE_FIELDS);
  }

  async findSucceededByAppointmentId(appointmentId) {
    return Payment.findOne({ appointmentId, status: 'SUCCEEDED', isActive: true }).populate(POPULATE_FIELDS);
  }

  async updateById(id, data) {
    return Payment.findByIdAndUpdate(id, data, { new: true, runValidators: true }).populate(POPULATE_FIELDS);
  }

  async findByPatientUserId(userId, { page = 1, limit = 20 } = {}) {
    const filter = { bookedByUserId: userId, isActive: true };
    const skip = (page - 1) * limit;
    const [payments, total] = await Promise.all([
      Payment.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate(POPULATE_FIELDS),
      Payment.countDocuments(filter),
    ]);
    return {
      payments,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  async findAll({ page = 1, limit = 20, status, gateway, search, patientProfileId } = {}) {
    const filter = { isActive: true };
    if (status) filter.status = status;
    if (gateway) filter.gateway = gateway;
    if (patientProfileId) filter.patientProfileId = patientProfileId;
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      filter.$or = [
        { gatewayOrderId: regex },
        { gatewayTransactionId: regex },
      ];
    }

    const skip = (page - 1) * limit;
    const [payments, total] = await Promise.all([
      Payment.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate(POPULATE_FIELDS),
      Payment.countDocuments(filter),
    ]);
    return {
      payments,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  }
}

module.exports = PaymentRepository;

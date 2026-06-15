const PharmacyOrder = require('../models/pharmacyOrder.model');

const POPULATE = [
  { path: 'patientProfileId', select: 'userId', populate: { path: 'userId', select: 'firstName lastName email phone' } },
  { path: 'prescriptionId' },
  { path: 'prescriptionUploadId' },
  { path: 'placedByUserId', select: 'firstName lastName email role' },
  { path: 'fulfilledByUserId', select: 'firstName lastName email' },
  { path: 'items.medicineId', select: 'name genericName strength form sellingPrice' },
];

class PharmacyOrderRepository {
  generateOrderNumber() {
    const ts = Date.now().toString(36).toUpperCase();
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `PH-${ts}-${rand}`;
  }

  async create(data) {
    const order = await PharmacyOrder.create(data);
    return order.populate(POPULATE);
  }

  async findById(id) {
    return PharmacyOrder.findById(id).populate(POPULATE);
  }

  async findByOrderNumber(orderNumber) {
    return PharmacyOrder.findOne({ orderNumber, isActive: true }).populate(POPULATE);
  }

  async updateById(id, data) {
    return PharmacyOrder.findByIdAndUpdate(id, data, { new: true, runValidators: true }).populate(
      POPULATE,
    );
  }

  async findAll({ page = 1, limit = 10, status, patientProfileId, isActive }) {
    const filter = {};
    if (isActive !== undefined) filter.isActive = isActive;
    if (status) filter.status = status;
    if (patientProfileId) filter.patientProfileId = patientProfileId;

    const skip = (page - 1) * limit;
    const [orders, total] = await Promise.all([
      PharmacyOrder.find(filter).populate(POPULATE).sort({ createdAt: -1 }).skip(skip).limit(limit),
      PharmacyOrder.countDocuments(filter),
    ]);

    return {
      orders,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  async findByPatientProfileId(patientProfileId) {
    return PharmacyOrder.find({ patientProfileId, isActive: true })
      .populate(POPULATE)
      .sort({ createdAt: -1 });
  }
}

module.exports = PharmacyOrderRepository;

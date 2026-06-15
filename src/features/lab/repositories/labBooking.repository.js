const LabBooking = require('../models/labBooking.model');

const POPULATE = [
  { path: 'patientProfileId', select: 'userId', populate: { path: 'userId', select: 'firstName lastName email phone' } },
  { path: 'labId', select: 'name city address phone homeCollectionFee' },
  { path: 'placedByUserId', select: 'firstName lastName email role' },
  { path: 'fulfilledByUserId', select: 'firstName lastName email' },
  { path: 'items.labTestId', select: 'name code category turnaroundHours' },
];

class LabBookingRepository {
  generateBookingNumber() {
    const ts = Date.now().toString(36).toUpperCase();
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `LB-${ts}-${rand}`;
  }

  async create(data) {
    const booking = await LabBooking.create(data);
    return booking.populate(POPULATE);
  }

  async findById(id) {
    return LabBooking.findById(id).populate(POPULATE);
  }

  async updateById(id, data) {
    return LabBooking.findByIdAndUpdate(id, data, { new: true, runValidators: true }).populate(POPULATE);
  }

  async findAll({ page = 1, limit = 10, status, labId, collectionType, patientProfileId, isActive }) {
    const filter = {};
    if (isActive !== undefined) filter.isActive = isActive;
    if (status) filter.status = status;
    if (labId) filter.labId = labId;
    if (collectionType) filter.collectionType = collectionType;
    if (patientProfileId) filter.patientProfileId = patientProfileId;

    const skip = (page - 1) * limit;
    const [bookings, total] = await Promise.all([
      LabBooking.find(filter).populate(POPULATE).sort({ createdAt: -1 }).skip(skip).limit(limit),
      LabBooking.countDocuments(filter),
    ]);

    return {
      bookings,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  async findByPatientProfileId(patientProfileId) {
    return LabBooking.find({ patientProfileId, isActive: true })
      .populate(POPULATE)
      .sort({ createdAt: -1 });
  }
}

module.exports = LabBookingRepository;

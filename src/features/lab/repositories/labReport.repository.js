const LabReport = require('../models/labReport.model');

const POPULATE = [
  { path: 'patientProfileId', select: 'userId', populate: { path: 'userId', select: 'firstName lastName email phone' } },
  { path: 'labId', select: 'name city' },
  { path: 'labBookingId', select: 'bookingNumber status scheduledDate' },
  { path: 'uploadedByUserId', select: 'firstName lastName email role' },
];

class LabReportRepository {
  async create(data) {
    const report = await LabReport.create(data);
    return report.populate(POPULATE);
  }

  async findById(id) {
    return LabReport.findById(id).populate(POPULATE);
  }

  async updateById(id, data) {
    return LabReport.findByIdAndUpdate(id, data, { new: true, runValidators: true }).populate(POPULATE);
  }

  async findAll({ page = 1, limit = 10, status, labId, patientProfileId, isActive }) {
    const filter = {};
    if (isActive !== undefined) filter.isActive = isActive;
    if (status) filter.status = status;
    if (labId) filter.labId = labId;
    if (patientProfileId) filter.patientProfileId = patientProfileId;

    const skip = (page - 1) * limit;
    const [reports, total] = await Promise.all([
      LabReport.find(filter).populate(POPULATE).sort({ createdAt: -1 }).skip(skip).limit(limit),
      LabReport.countDocuments(filter),
    ]);

    return {
      reports,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  async findByPatientProfileId(patientProfileId) {
    return LabReport.find({ patientProfileId, isActive: true })
      .populate(POPULATE)
      .sort({ createdAt: -1 });
  }
}

module.exports = LabReportRepository;

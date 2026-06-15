const PrescriptionUpload = require('../models/prescriptionUpload.model');

const POPULATE = [
  { path: 'patientProfileId', select: 'userId', populate: { path: 'userId', select: 'firstName lastName email phone' } },
  { path: 'prescriptionId' },
  { path: 'uploadedByUserId', select: 'firstName lastName email role' },
  { path: 'reviewedByUserId', select: 'firstName lastName email' },
];

class PrescriptionUploadRepository {
  async create(data) {
    const upload = await PrescriptionUpload.create(data);
    return upload.populate(POPULATE);
  }

  async findById(id) {
    return PrescriptionUpload.findById(id).populate(POPULATE);
  }

  async updateById(id, data) {
    return PrescriptionUpload.findByIdAndUpdate(id, data, { new: true, runValidators: true }).populate(
      POPULATE,
    );
  }

  async findAll({ page = 1, limit = 10, status, patientProfileId, isActive }) {
    const filter = {};
    if (isActive !== undefined) filter.isActive = isActive;
    if (status) filter.status = status;
    if (patientProfileId) filter.patientProfileId = patientProfileId;

    const skip = (page - 1) * limit;
    const [uploads, total] = await Promise.all([
      PrescriptionUpload.find(filter).populate(POPULATE).sort({ createdAt: -1 }).skip(skip).limit(limit),
      PrescriptionUpload.countDocuments(filter),
    ]);

    return {
      uploads,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  async findByPatientProfileId(patientProfileId) {
    return PrescriptionUpload.find({ patientProfileId, isActive: true })
      .populate(POPULATE)
      .sort({ createdAt: -1 });
  }
}

module.exports = PrescriptionUploadRepository;

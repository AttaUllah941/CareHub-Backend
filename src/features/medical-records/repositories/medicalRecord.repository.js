const MedicalRecord = require('../models/medicalRecord.model');

const POPULATE_FIELDS = [
  {
    path: 'patientProfileId',
    select: 'userId gender city',
    populate: { path: 'userId', select: 'firstName lastName email phone' },
  },
  { path: 'familyMemberId', select: 'firstName lastName relationship' },
  { path: 'consultationId', select: 'diagnosis appointmentId' },
  { path: 'appointmentId', select: 'appointmentDate startTime status' },
  { path: 'uploadedByUserId', select: 'firstName lastName email' },
  { path: 'history.uploadedByUserId', select: 'firstName lastName email' },
];

class MedicalRecordRepository {
  async create(data) {
    const record = await MedicalRecord.create(data);
    return record.populate(POPULATE_FIELDS);
  }

  async findById(id) {
    return MedicalRecord.findById(id).populate(POPULATE_FIELDS);
  }

  async updateById(id, data) {
    return MedicalRecord.findByIdAndUpdate(id, data, { new: true, runValidators: true }).populate(
      POPULATE_FIELDS,
    );
  }

  async softDeleteById(id) {
    return MedicalRecord.findByIdAndUpdate(id, { isActive: false }, { new: true }).populate(
      POPULATE_FIELDS,
    );
  }

  async findByPatientProfileId(patientProfileId, { recordType } = {}) {
    const filter = { patientProfileId, isActive: true };
    if (recordType) filter.recordType = recordType;
    return MedicalRecord.find(filter).sort({ createdAt: -1 }).populate(POPULATE_FIELDS);
  }

  async findByConsultationId(consultationId) {
    return MedicalRecord.find({ consultationId, isActive: true })
      .sort({ createdAt: -1 })
      .populate(POPULATE_FIELDS);
  }

  async findAll({
    page = 1,
    limit = 10,
    patientProfileId,
    recordType,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  }) {
    const filter = { isActive: true };
    if (patientProfileId) filter.patientProfileId = patientProfileId;
    if (recordType) filter.recordType = recordType;

    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      filter.$or = [{ title: regex }, { description: regex }, { originalFileName: regex }];
    }

    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const [records, total] = await Promise.all([
      MedicalRecord.find(filter).sort(sort).skip(skip).limit(limit).populate(POPULATE_FIELDS),
      MedicalRecord.countDocuments(filter),
    ]);

    return {
      records,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  }
}

module.exports = MedicalRecordRepository;

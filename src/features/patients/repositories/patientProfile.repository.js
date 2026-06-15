const PatientProfile = require('../models/patientProfile.model');
const User = require('../../auth/models/user.model');

const POPULATE_FIELDS = [
  { path: 'userId', select: 'firstName lastName email phone isActive isEmailVerified role createdAt' },
];

class PatientProfileRepository {
  async create(data) {
    const profile = await PatientProfile.create(data);
    return profile.populate(POPULATE_FIELDS);
  }

  async findById(id) {
    return PatientProfile.findById(id).populate(POPULATE_FIELDS);
  }

  async findByUserId(userId) {
    return PatientProfile.findOne({ userId }).populate(POPULATE_FIELDS);
  }

  async updateById(id, data) {
    return PatientProfile.findByIdAndUpdate(id, data, { new: true, runValidators: true }).populate(
      POPULATE_FIELDS,
    );
  }

  async softDeleteById(id) {
    return PatientProfile.findByIdAndUpdate(id, { isActive: false }, { new: true }).populate(
      POPULATE_FIELDS,
    );
  }

  async findAll({ page = 1, limit = 10, search, bloodGroup, isActive, sortBy = 'createdAt', sortOrder = 'desc' }) {
    const filter = {};
    if (bloodGroup) filter.bloodGroup = bloodGroup;
    if (isActive !== undefined) filter.isActive = isActive;

    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      const matchingUsers = await User.find({
        role: 'PATIENT',
        $or: [{ firstName: regex }, { lastName: regex }, { email: regex }, { phone: regex }],
      }).select('_id');
      const userIds = matchingUsers.map((u) => u._id);

      filter.$or = [
        { userId: { $in: userIds } },
        { city: regex },
        { 'emergencyContact.name': regex },
      ];
    }

    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const [patients, total] = await Promise.all([
      PatientProfile.find(filter).sort(sort).skip(skip).limit(limit).populate(POPULATE_FIELDS),
      PatientProfile.countDocuments(filter),
    ]);

    return {
      patients,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  }
}

module.exports = PatientProfileRepository;

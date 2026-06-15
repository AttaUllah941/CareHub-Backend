const FamilyMember = require('../models/familyMember.model');

const POPULATE_FIELDS = [
  {
    path: 'patientProfileId',
    select: 'userId bloodGroup',
    populate: { path: 'userId', select: 'firstName lastName email phone' },
  },
];

class FamilyMemberRepository {
  async create(data) {
    const member = await FamilyMember.create(data);
    return member.populate(POPULATE_FIELDS);
  }

  async findById(id) {
    return FamilyMember.findById(id).populate(POPULATE_FIELDS);
  }

  async findByPatientProfileId(patientProfileId, { isActive } = {}) {
    const filter = { patientProfileId };
    if (isActive !== undefined) filter.isActive = isActive;
    return FamilyMember.find(filter).sort({ relationship: 1, firstName: 1 }).populate(POPULATE_FIELDS);
  }

  async findByPatientAndRelationship(patientProfileId, relationship, excludeId = null) {
    const filter = { patientProfileId, relationship, isActive: true };
    if (excludeId) filter._id = { $ne: excludeId };
    return FamilyMember.findOne(filter);
  }

  async updateById(id, data) {
    return FamilyMember.findByIdAndUpdate(id, data, { new: true, runValidators: true }).populate(
      POPULATE_FIELDS,
    );
  }

  async softDeleteById(id) {
    return FamilyMember.findByIdAndUpdate(id, { isActive: false }, { new: true }).populate(
      POPULATE_FIELDS,
    );
  }

  async findAll({
    page = 1,
    limit = 10,
    patientProfileId,
    relationship,
    search,
    isActive,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  }) {
    const filter = {};
    if (patientProfileId) filter.patientProfileId = patientProfileId;
    if (relationship) filter.relationship = relationship;
    if (isActive !== undefined) filter.isActive = isActive;

    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      filter.$or = [{ firstName: regex }, { lastName: regex }, { phone: regex }, { email: regex }];
    }

    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const [familyMembers, total] = await Promise.all([
      FamilyMember.find(filter).sort(sort).skip(skip).limit(limit).populate(POPULATE_FIELDS),
      FamilyMember.countDocuments(filter),
    ]);

    return {
      familyMembers,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  }
}

module.exports = FamilyMemberRepository;

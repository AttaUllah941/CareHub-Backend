const {
  ConflictError,
  NotFoundError,
  ForbiddenError,
  BadRequestError,
} = require('../../../core/errors/AppError');
const { UserRole } = require('../../../shared/enums/userRole.enum');
const {
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
} = require('../../../shared/constants/pagination.constants');
const { UNIQUE_PER_PATIENT_RELATIONSHIPS } = require('../../../shared/enums/familyRelationship.enum');

class FamilyMemberService {
  constructor(familyMemberRepository, patientProfileRepository) {
    this.familyMemberRepository = familyMemberRepository;
    this.patientProfileRepository = patientProfileRepository;
  }

  _isAdmin(requestedBy) {
    return requestedBy && [UserRole.SUPER_ADMIN, UserRole.ADMIN].includes(requestedBy.role);
  }

  _format(member) {
    const json = member.toJSON ? member.toJSON() : member;
    const patient = json.patientProfileId;

    return {
      ...json,
      patientProfileId:
        patient?.id || patient?._id?.toString() || json.patientProfileId?.toString(),
      patient: patient && typeof patient === 'object'
        ? {
            id: patient.id || patient._id?.toString(),
            user: patient.userId,
          }
        : undefined,
    };
  }

  async _resolvePatientProfile(patientProfileId) {
    const profile = await this.patientProfileRepository.findById(patientProfileId);
    if (!profile) throw new NotFoundError('Patient profile not found');
    return profile;
  }

  async _resolvePatientProfileByUser(userId) {
    const profile = await this.patientProfileRepository.findByUserId(userId);
    if (!profile) throw new NotFoundError('Patient profile not found. Complete your profile first.');
    return profile;
  }

  _canAccessMember(member, requestedBy) {
    if (this._isAdmin(requestedBy)) return true;
    if (requestedBy?.role === UserRole.DOCTOR) return true;

    const patientUserId =
      member.patientProfileId?.userId?._id?.toString() ||
      member.patientProfileId?.userId?.id ||
      member.patientProfileId?.userId?.toString();

    if (requestedBy?.role === UserRole.PATIENT && patientUserId === requestedBy.id) {
      return true;
    }

    return false;
  }

  async _validateUniqueRelationship(patientProfileId, relationship, excludeId = null) {
    if (!UNIQUE_PER_PATIENT_RELATIONSHIPS.includes(relationship)) return;

    const existing = await this.familyMemberRepository.findByPatientAndRelationship(
      patientProfileId,
      relationship,
      excludeId,
    );
    if (existing) {
      throw new ConflictError(`A ${relationship.toLowerCase()} family member already exists for this patient`);
    }
  }

  async getFamilyMembers(query, requestedBy) {
    if (!this._isAdmin(requestedBy)) {
      throw new ForbiddenError('Insufficient permissions');
    }

    const result = await this.familyMemberRepository.findAll({
      page: parseInt(query.page, 10) || DEFAULT_PAGE,
      limit: parseInt(query.limit, 10) || DEFAULT_LIMIT,
      patientProfileId: query.patientProfileId,
      relationship: query.relationship,
      search: query.search,
      isActive: query.isActive !== undefined ? query.isActive === 'true' : undefined,
      sortBy: query.sortBy || 'createdAt',
      sortOrder: query.sortOrder || 'desc',
    });

    return {
      familyMembers: result.familyMembers.map((m) => this._format(m)),
      pagination: result.pagination,
    };
  }

  async getMyFamilyMembers(requestedBy) {
    if (!requestedBy || requestedBy.role !== UserRole.PATIENT) {
      throw new ForbiddenError('Only patients can access this resource');
    }

    const profile = await this._resolvePatientProfileByUser(requestedBy.id);
    const members = await this.familyMemberRepository.findByPatientProfileId(profile._id, {
      isActive: true,
    });
    return members.map((m) => this._format(m));
  }

  async getFamilyMembersByPatientId(patientProfileId, requestedBy) {
    await this._resolvePatientProfile(patientProfileId);

    if (!this._isAdmin(requestedBy) && requestedBy?.role !== UserRole.DOCTOR) {
      const profile = await this.patientProfileRepository.findById(patientProfileId);
      const userId = profile.userId?._id?.toString() || profile.userId?.toString();
      if (requestedBy?.role !== UserRole.PATIENT || userId !== requestedBy.id) {
        throw new ForbiddenError('Insufficient permissions');
      }
    }

    const members = await this.familyMemberRepository.findByPatientProfileId(patientProfileId, {
      isActive: queryIsActive(requestedBy),
    });
    return members.map((m) => this._format(m));
  }

  async getFamilyMemberById(id, requestedBy) {
    const member = await this.familyMemberRepository.findById(id);
    if (!member) throw new NotFoundError('Family member not found');

    if (!this._canAccessMember(member, requestedBy)) {
      throw new ForbiddenError('Insufficient permissions');
    }

    return this._format(member);
  }

  async createFamilyMember(data, requestedBy) {
    if (!this._isAdmin(requestedBy)) {
      throw new ForbiddenError('Insufficient permissions');
    }

    await this._resolvePatientProfile(data.patientProfileId);
    await this._validateUniqueRelationship(data.patientProfileId, data.relationship);

    const member = await this.familyMemberRepository.create(data);
    return this._format(member);
  }

  async createMyFamilyMember(data, requestedBy) {
    if (!requestedBy || requestedBy.role !== UserRole.PATIENT) {
      throw new ForbiddenError('Only patients can create family members');
    }

    const profile = await this._resolvePatientProfileByUser(requestedBy.id);
    await this._validateUniqueRelationship(profile._id, data.relationship);

    const member = await this.familyMemberRepository.create({
      ...data,
      patientProfileId: profile._id,
    });
    return this._format(member);
  }

  async updateFamilyMember(id, data, requestedBy) {
    if (!this._isAdmin(requestedBy)) {
      throw new ForbiddenError('Insufficient permissions');
    }

    const member = await this.familyMemberRepository.findById(id);
    if (!member) throw new NotFoundError('Family member not found');

    if (data.relationship || data.patientProfileId) {
      const patientProfileId = data.patientProfileId || member.patientProfileId._id || member.patientProfileId;
      const relationship = data.relationship || member.relationship;
      await this._validateUniqueRelationship(patientProfileId, relationship, id);
    }

    delete data.patientProfileId;

    const updated = await this.familyMemberRepository.updateById(id, data);
    return this._format(updated);
  }

  async updateMyFamilyMember(id, data, requestedBy) {
    if (!requestedBy || requestedBy.role !== UserRole.PATIENT) {
      throw new ForbiddenError('Only patients can update family members');
    }

    const member = await this.familyMemberRepository.findById(id);
    if (!member) throw new NotFoundError('Family member not found');

    if (!this._canAccessMember(member, requestedBy)) {
      throw new ForbiddenError('Insufficient permissions');
    }

    if (data.relationship) {
      const patientProfileId = member.patientProfileId._id || member.patientProfileId;
      await this._validateUniqueRelationship(patientProfileId, data.relationship, id);
    }

    const updated = await this.familyMemberRepository.updateById(id, data);
    return this._format(updated);
  }

  async deleteFamilyMember(id, requestedBy) {
    if (!this._isAdmin(requestedBy)) {
      throw new ForbiddenError('Insufficient permissions');
    }

    const member = await this.familyMemberRepository.findById(id);
    if (!member) throw new NotFoundError('Family member not found');

    await this.familyMemberRepository.softDeleteById(id);
    return { message: 'Family member removed successfully' };
  }

  async deleteMyFamilyMember(id, requestedBy) {
    if (!requestedBy || requestedBy.role !== UserRole.PATIENT) {
      throw new ForbiddenError('Only patients can delete family members');
    }

    const member = await this.familyMemberRepository.findById(id);
    if (!member) throw new NotFoundError('Family member not found');

    if (!this._canAccessMember(member, requestedBy)) {
      throw new ForbiddenError('Insufficient permissions');
    }

    await this.familyMemberRepository.softDeleteById(id);
    return { message: 'Family member removed successfully' };
  }
}

function queryIsActive(requestedBy) {
  return requestedBy?.role === UserRole.PATIENT ? true : undefined;
}

module.exports = FamilyMemberService;

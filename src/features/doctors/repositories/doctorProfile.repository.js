const mongoose = require('mongoose');
const DoctorProfile = require('../models/doctorProfile.model');
const User = require('../../auth/models/user.model');
const Clinic = require('../../clinics/models/clinic.model');
const DoctorAvailability = require('../../doctor-availability/models/doctorAvailability.model');
const { DoctorVerificationStatus } = require('../../../shared/enums/doctorVerificationStatus.enum');

const POPULATE_FIELDS = [
  { path: 'userId', select: 'firstName lastName email phone isActive isEmailVerified role createdAt' },
  { path: 'specialtyIds', select: 'name slug description' },
  { path: 'languageIds', select: 'name code nativeName' },
];

const SEARCH_USER_FIELDS = 'firstName lastName';

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function intersectObjectIds(...arrays) {
  const defined = arrays.filter((arr) => arr !== null && arr !== undefined);
  if (!defined.length) return null;
  if (defined.length === 1) return defined[0];

  const sets = defined.map((arr) => new Set(arr.map((id) => id.toString())));
  const [first, ...rest] = sets;
  const intersection = [...first].filter((id) => rest.every((set) => set.has(id)));
  return intersection.map((id) => new mongoose.Types.ObjectId(id));
}

function isOnVacation(vacationDates, date) {
  if (!vacationDates?.length) return false;
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  const targetTime = target.getTime();

  return vacationDates.some((vacation) => {
    const start = new Date(vacation.startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(vacation.endDate);
    end.setHours(23, 59, 59, 999);
    return targetTime >= start.getTime() && targetTime <= end.getTime();
  });
}

class DoctorProfileRepository {
  async create(data) {
    const profile = await DoctorProfile.create(data);
    return profile.populate(POPULATE_FIELDS);
  }

  async findById(id) {
    return DoctorProfile.findById(id).populate(POPULATE_FIELDS);
  }

  async findByUserId(userId) {
    return DoctorProfile.findOne({ userId }).populate(POPULATE_FIELDS);
  }

  async updateById(id, data) {
    return DoctorProfile.findByIdAndUpdate(id, data, { new: true, runValidators: true }).populate(
      POPULATE_FIELDS,
    );
  }

  async softDeleteById(id) {
    return DoctorProfile.findByIdAndUpdate(id, { isActive: false }, { new: true }).populate(
      POPULATE_FIELDS,
    );
  }

  async findAll({
    page = 1,
    limit = 10,
    search,
    verificationStatus,
    specialtyId,
    isActive,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  }) {
    const filter = {};
    if (verificationStatus) filter.verificationStatus = verificationStatus;
    if (isActive !== undefined) filter.isActive = isActive;
    if (specialtyId) filter.specialtyIds = specialtyId;

    if (search) {
      const regex = new RegExp(escapeRegex(search), 'i');
      const matchingUsers = await User.find({
        role: 'DOCTOR',
        $or: [{ firstName: regex }, { lastName: regex }, { email: regex }, { phone: regex }],
      }).select('_id');
      const userIds = matchingUsers.map((u) => u._id);

      filter.$or = [
        { userId: { $in: userIds } },
        { licenseNumber: regex },
        { medicalRegistrationNumber: regex },
        { title: regex },
        { city: regex },
      ];
    }

    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const [doctors, total] = await Promise.all([
      DoctorProfile.find(filter).populate(POPULATE_FIELDS).sort(sort).skip(skip).limit(limit),
      DoctorProfile.countDocuments(filter),
    ]);

    return {
      doctors,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  async _resolveNameUserIds(name) {
    const regex = new RegExp(escapeRegex(name), 'i');
    const matchingUsers = await User.find({
      role: 'DOCTOR',
      $or: [{ firstName: regex }, { lastName: regex }],
    })
      .select('_id')
      .lean();
    return matchingUsers.map((u) => u._id);
  }

  async _resolveClinicDoctorIds({ clinicId, city }) {
    if (clinicId) {
      const clinic = await Clinic.findOne({ _id: clinicId, isActive: true })
        .select('doctorProfileIds')
        .lean();
      return clinic ? clinic.doctorProfileIds : [];
    }

    if (city) {
      const regex = new RegExp(escapeRegex(city), 'i');
      const clinics = await Clinic.find({ city: regex, isActive: true }).select('doctorProfileIds').lean();
      return clinics.flatMap((c) => c.doctorProfileIds);
    }

    return null;
  }

  async _resolveAvailabilityDoctorIds({ availableDay, availableDate }) {
    let day = availableDay;
    if (availableDate !== undefined && day === undefined) {
      day = new Date(availableDate).getDay();
    }

    const availFilter = { isActive: true };
    if (day !== undefined) {
      availFilter.weeklySchedule = {
        $elemMatch: { dayOfWeek: parseInt(day, 10), isAvailable: true },
      };
    }

    const rows = await DoctorAvailability.find(availFilter)
      .select('doctorProfileId vacationDates')
      .lean();

    if (availableDate) {
      return rows
        .filter((row) => !isOnVacation(row.vacationDates, availableDate))
        .map((row) => row.doctorProfileId);
    }

    return rows.map((row) => row.doctorProfileId);
  }

  async _attachClinics(doctors) {
    if (!doctors.length) return new Map();

    const doctorIds = doctors.map((d) => d._id);
    const clinics = await Clinic.find({ doctorProfileIds: { $in: doctorIds }, isActive: true })
      .select('name city doctorProfileIds')
      .lean();

    const clinicMap = new Map();
    for (const clinic of clinics) {
      for (const doctorId of clinic.doctorProfileIds) {
        const key = doctorId.toString();
        if (!clinicMap.has(key)) clinicMap.set(key, []);
        clinicMap.get(key).push({
          id: clinic._id.toString(),
          name: clinic.name,
          city: clinic.city,
        });
      }
    }
    return clinicMap;
  }

  async _attachAvailabilityDays(doctors) {
    if (!doctors.length) return new Map();

    const doctorIds = doctors.map((d) => d._id);
    const rows = await DoctorAvailability.find({
      doctorProfileId: { $in: doctorIds },
      isActive: true,
    })
      .select('doctorProfileId weeklySchedule')
      .lean();

    const availabilityMap = new Map();
    for (const row of rows) {
      const days = (row.weeklySchedule || [])
        .filter((schedule) => schedule.isAvailable)
        .map((schedule) => schedule.dayOfWeek);
      availabilityMap.set(row.doctorProfileId.toString(), days);
    }
    return availabilityMap;
  }

  async searchPublic({
    page = 1,
    limit = 10,
    name,
    specialtyId,
    clinicId,
    city,
    minFee,
    maxFee,
    languageId,
    gender,
    minExperience,
    maxExperience,
    availableDay,
    availableDate,
    sortBy = 'yearsOfExperience',
    sortOrder = 'desc',
  }) {
    const filter = {
      verificationStatus: DoctorVerificationStatus.VERIFIED,
      isActive: true,
    };

    const idFilters = [];

    if (clinicId) {
      const clinicDoctorIds = await this._resolveClinicDoctorIds({ clinicId });
      if (!clinicDoctorIds.length) {
        return { doctors: [], pagination: { page, limit, total: 0, totalPages: 1 } };
      }
      idFilters.push(clinicDoctorIds);
    }

    if (availableDay !== undefined || availableDate) {
      const availabilityIds = await this._resolveAvailabilityDoctorIds({ availableDay, availableDate });
      if (!availabilityIds.length) {
        return { doctors: [], pagination: { page, limit, total: 0, totalPages: 1 } };
      }
      idFilters.push(availabilityIds);
    }

    const intersectedIds = intersectObjectIds(...idFilters);
    if (intersectedIds) {
      filter._id = { $in: intersectedIds };
    }

    if (name) {
      const userIds = await this._resolveNameUserIds(name);
      if (!userIds.length) {
        return { doctors: [], pagination: { page, limit, total: 0, totalPages: 1 } };
      }
      filter.userId = { $in: userIds };
    }

    if (gender) filter.gender = gender;
    if (specialtyId) filter.specialtyIds = specialtyId;
    if (languageId) filter.languageIds = languageId;

    if (minExperience !== undefined || maxExperience !== undefined) {
      filter.yearsOfExperience = {};
      if (minExperience !== undefined) filter.yearsOfExperience.$gte = minExperience;
      if (maxExperience !== undefined) filter.yearsOfExperience.$lte = maxExperience;
    }

    if (minFee !== undefined || maxFee !== undefined) {
      filter.consultationFee = {};
      if (minFee !== undefined) filter.consultationFee.$gte = minFee;
      if (maxFee !== undefined) filter.consultationFee.$lte = maxFee;
    }

    if (city && !clinicId) {
      const regex = new RegExp(escapeRegex(city), 'i');
      const clinicDoctorIds = await this._resolveClinicDoctorIds({ city });
      const cityConditions = [{ city: regex }];
      if (clinicDoctorIds.length) {
        cityConditions.push({ _id: { $in: clinicDoctorIds } });
      }
      filter.$and = [...(filter.$and || []), { $or: cityConditions }];
    }

    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const [doctors, total] = await Promise.all([
      DoctorProfile.find(filter)
        .populate([
          { path: 'userId', select: SEARCH_USER_FIELDS },
          { path: 'specialtyIds', select: 'name slug' },
          { path: 'languageIds', select: 'name code' },
        ])
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      DoctorProfile.countDocuments(filter),
    ]);

    const [clinicMap, availabilityMap] = await Promise.all([
      this._attachClinics(doctors),
      this._attachAvailabilityDays(doctors),
    ]);

    const enrichedDoctors = doctors.map((doctor) => ({
      ...doctor,
      clinics: clinicMap.get(doctor._id.toString()) || [],
      availableDays: availabilityMap.get(doctor._id.toString()) || [],
    }));

    return {
      doctors: enrichedDoctors,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  }
}

module.exports = DoctorProfileRepository;

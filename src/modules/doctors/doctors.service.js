const {
  NotFoundError,
  ForbiddenError,
  BadRequestError,
} = require('../../core/errors/AppError');
const { parsePaginationQuery, buildPaginationMeta } = require('../../core/utils/pagination.util');
const { Specialty } = require('../specialties/specialties.model');
const { User } = require('../users/users.model');
const doctorsRepository = require('./doctors.repository');
const {
  toDoctorSearchResult,
  toDoctorDetailProfile,
} = require('./doctors.public.mapper');

const PUBLIC_SORT_FIELDS = [
  'yearsOfExperience',
  'averageRating',
  'consultationFee',
  'reviewCount',
  'fullName',
  'createdAt',
];

const ADMIN_SORT_FIELDS = [
  'createdAt',
  'yearsOfExperience',
  'consultationFee',
  'verificationStatus',
  'fullName',
];

const LEGACY_SPECIALTY_SLUG_MAP = {
  cardiology: 'cardiologist',
  dermatology: 'dermatologist',
  'general-medicine': 'general-physician',
  gynecology: 'gynecologist-obstetrician-obgyn',
  pediatrics: 'pediatrician',
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const resolveSpecialtySlug = (slug) => {
  if (!slug) return '';
  const normalized = slug.trim().toLowerCase();
  return LEGACY_SPECIALTY_SLUG_MAP[normalized] ?? normalized;
};

const toQualificationResponse = (qualification) => ({
  degree: qualification.degree || '',
  institution: qualification.institution || qualification.institute || '',
  year: qualification.year,
});

const toWorkHistoryResponse = (entry) => ({
  organization: entry.organization,
  position: entry.position,
  startYear: entry.from,
  endYear: entry.to,
  isCurrent: entry.to == null,
});

const toPortalUser = (user) => {
  if (!user?.firstName) return undefined;

  return {
    id: user._id.toString(),
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone,
  };
};

const toDoctorProfile = (doctor) => ({
  id: doctor._id.toString(),
  userId: doctor.userId?._id?.toString() || doctor.userId?.toString(),
  user: toPortalUser(doctor.userId),
  title: doctor.title || '',
  gender: doctor.gender,
  dateOfBirth: doctor.dateOfBirth?.toISOString(),
  city: doctor.city || '',
  bio: doctor.bio || '',
  about: doctor.about || '',
  yearsOfExperience: doctor.yearsOfExperience ?? 0,
  licenseNumber: doctor.licenseNumber || '',
  licenseAuthority: doctor.licenseAuthority || '',
  medicalRegistrationNumber: doctor.medicalRegistrationNumber || '',
  qualifications: (doctor.qualifications || []).map(toQualificationResponse),
  workHistory: (doctor.workHistory || []).map(toWorkHistoryResponse),
  specialtyIds: (doctor.specialtyIds || [])
    .map((item) => (item?._id ? item._id.toString() : item?.toString()))
    .filter(Boolean),
  specialties: (doctor.specialtyIds || [])
    .map((item) =>
      item?.name
        ? {
            id: item._id.toString(),
            name: item.name,
            slug: item.slug,
          }
        : null,
    )
    .filter(Boolean),
  languageIds: (doctor.languageIds || [])
    .map((item) => (item?._id ? item._id.toString() : item?.toString()))
    .filter(Boolean),
  languages: (doctor.languageIds || [])
    .map((item) =>
      item?.name
        ? {
            id: item._id.toString(),
            name: item.name,
            code: item.code,
          }
        : null,
    )
    .filter(Boolean),
  consultationFee: doctor.consultationFee ?? 0,
  currency: doctor.currency || 'PKR',
  verificationStatus: doctor.verificationStatus,
  rejectionReason: doctor.rejectionReason || '',
  profileImageUrl: doctor.profileImageUrl || '',
  averageRating: doctor.averageRating ?? 0,
  reviewCount: doctor.reviewCount ?? 0,
  createdAt: doctor.createdAt?.toISOString(),
  updatedAt: doctor.updatedAt?.toISOString(),
});

const buildPublicSearchFilter = async (query) => {
  const filter = { verificationStatus: 'VERIFIED', isActive: true };

  if (query.city?.trim()) {
    filter.city = new RegExp(`^${escapeRegex(query.city.trim())}$`, 'i');
  }

  const specialtySlug = resolveSpecialtySlug(query.specialtySlug || query.specialty);
  if (specialtySlug) {
    const specialty = await Specialty.findOne({ slug: specialtySlug, isActive: true }).lean();
    if (!specialty) {
      return null;
    }
    filter.specialtyIds = specialty._id;
  }

  const searchTerm = (query.name || query.search || '').trim();
  if (searchTerm) {
    const regex = new RegExp(escapeRegex(searchTerm), 'i');
    const matchingUsers = await User.find({
      $or: [{ firstName: regex }, { lastName: regex }],
    })
      .select('_id')
      .lean();
    const userIds = matchingUsers.map((user) => user._id);

    filter.$or = [{ fullName: regex }, { title: regex }];
    if (userIds.length) {
      filter.$or.push({ userId: { $in: userIds } });
    }
  }

  const minFee = query.minFee != null && query.minFee !== '' ? Number(query.minFee) : null;
  const maxFee = query.maxFee != null && query.maxFee !== '' ? Number(query.maxFee) : null;

  if (minFee != null && !Number.isNaN(minFee)) {
    filter.consultationFee = { ...(filter.consultationFee || {}), $gte: minFee };
  }

  if (maxFee != null && !Number.isNaN(maxFee)) {
    filter.consultationFee = { ...(filter.consultationFee || {}), $lte: maxFee };
  }

  return filter;
};

const buildAdminSearchFilter = (query) => {
  const filter = {};

  if (query.verificationStatus) {
    filter.verificationStatus = query.verificationStatus;
  }

  const searchTerm = (query.search || '').trim();
  if (searchTerm) {
    const regex = new RegExp(escapeRegex(searchTerm), 'i');
    filter.$or = [{ fullName: regex }, { title: regex }];
  }

  return filter;
};

const ensureDoctorProfile = async (userId) => {
  const existing = await doctorsRepository.findByUserId(userId);
  if (existing) return existing;

  const user = await doctorsRepository.findUserById(userId);
  if (!user) {
    throw new NotFoundError('User not found');
  }

  if (user.role !== 'DOCTOR') {
    throw new ForbiddenError('Only doctors can access this profile');
  }

  await doctorsRepository.create({
    userId: user._id,
    fullName: `${user.firstName} ${user.lastName}`.trim(),
    specialtyIds: [],
    languageIds: [],
    qualifications: [],
    workHistory: [],
    currency: 'PKR',
    verificationStatus: 'PENDING',
    isActive: true,
  });

  return doctorsRepository.findByUserId(userId);
};

const searchPublicDoctors = async (query) => {
  const { page, limit, skip, sort } = parsePaginationQuery(query, PUBLIC_SORT_FIELDS);
  const filter = await buildPublicSearchFilter(query);

  if (!filter) {
    return {
      doctors: [],
      pagination: buildPaginationMeta(page, limit, 0),
    };
  }

  const [doctors, total] = await doctorsRepository.searchPublic({ filter, sort, skip, limit });

  return {
    doctors: doctors.map(toDoctorSearchResult),
    pagination: buildPaginationMeta(page, limit, total),
  };
};

const getPublicDoctorById = async (doctorId) => {
  if (!doctorsRepository.isValidObjectId(doctorId)) {
    throw new NotFoundError('Doctor not found');
  }

  const doctor = await doctorsRepository.findVerifiedById(doctorId);
  if (!doctor) {
    throw new NotFoundError('Doctor not found');
  }

  return { doctor: toDoctorDetailProfile(doctor) };
};

const getMyProfile = async (userId) => {
  const doctor = await ensureDoctorProfile(userId);
  return { doctor: toDoctorProfile(doctor) };
};

const updateMyProfile = async (userId, payload) => {
  await ensureDoctorProfile(userId);

  const updates = { ...payload };

  if (payload.dateOfBirth) {
    updates.dateOfBirth = new Date(payload.dateOfBirth);
  }

  if (payload.profileImageUrl === '') {
    updates.profileImageUrl = '';
  }

  if (payload.qualifications) {
    updates.qualifications = payload.qualifications.map((item) => ({
      degree: item.degree,
      institute: item.institute || item.institution || '',
      year: item.year,
    }));
  }

  if (payload.workHistory) {
    updates.workHistory = payload.workHistory.map((item) => ({
      organization: item.organization,
      position: item.position,
      from: item.from ?? item.startYear,
      to: item.to ?? item.endYear,
    }));
  }

  delete updates.verificationStatus;
  delete updates.rejectionReason;
  delete updates.averageRating;
  delete updates.reviewCount;

  const doctor = await doctorsRepository.updateByUserId(userId, updates);
  if (!doctor) {
    throw new NotFoundError('Doctor profile not found');
  }

  return { doctor: toDoctorProfile(doctor) };
};

const listAdmin = async (query) => {
  const { page, limit, skip, sort } = parsePaginationQuery(query, ADMIN_SORT_FIELDS);
  const filter = buildAdminSearchFilter(query);

  const [doctors, total] = await doctorsRepository.searchAdmin({ filter, sort, skip, limit });

  return {
    doctors: doctors.map(toDoctorProfile),
    pagination: buildPaginationMeta(page, limit, total),
  };
};

const updateVerification = async (id, { status, rejectionReason }) => {
  if (!doctorsRepository.isValidObjectId(id)) {
    throw new NotFoundError('Doctor not found');
  }

  if (status === 'REJECTED' && !rejectionReason?.trim()) {
    throw new BadRequestError('Rejection reason is required when status is REJECTED');
  }

  const doctor = await doctorsRepository.updateVerificationStatus(id, {
    verificationStatus: status,
    rejectionReason: status === 'REJECTED' ? rejectionReason.trim() : '',
  });

  if (!doctor) {
    throw new NotFoundError('Doctor not found');
  }

  return { doctor: toDoctorProfile(doctor) };
};

module.exports = {
  searchPublicDoctors,
  getPublicDoctorById,
  getMyProfile,
  updateMyProfile,
  listAdmin,
  updateVerification,
};

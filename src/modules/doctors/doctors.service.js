const AppError = require('../../shared/errors/AppError');
const { parsePaginationQuery, buildPaginationMeta } = require('../../shared/utils/pagination');
const MedicalSpecialty = require('../specialties/specialties.model');
const doctorsRepository = require('./doctors.repository');

const PUBLIC_SORT_FIELDS = [
  'yearsOfExperience',
  'consultationFee',
  'averageRating',
  'reviewCount',
  'createdAt',
  'fullName',
];

const ADMIN_SORT_FIELDS = [
  'createdAt',
  'yearsOfExperience',
  'consultationFee',
  'verificationStatus',
  'fullName',
];

const DEFAULT_TIME_SLOTS = ['04:30 PM', '05:00 PM', '05:30 PM', '06:00 PM', '06:30 PM', '07:00 PM'];

const toSpecialtyResponse = (specialty) => {
  if (!specialty) return null;
  const id = specialty._id ? specialty._id.toString() : specialty.id;
  return {
    id,
    name: specialty.name,
    slug: specialty.slug,
    description: specialty.description,
    isActive: specialty.isActive,
  };
};

const toLanguageResponse = (language) => {
  if (!language) return null;
  const id = language._id ? language._id.toString() : language.id;
  return {
    id,
    name: language.name,
    code: language.code,
    isActive: language.isActive,
  };
};

const toQualificationResponse = (qualification) => ({
  degree: qualification.degree,
  institution: qualification.institute,
  year: qualification.year,
});

const toWorkHistoryResponse = (entry) => ({
  organization: entry.organization,
  position: entry.position,
  startYear: entry.from,
  endYear: entry.to,
  isCurrent: entry.to == null,
});

const toUserSummary = (user) => {
  if (!user) return undefined;
  return {
    id: user._id.toString(),
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone,
    isActive: user.isActive,
    isEmailVerified: user.isEmailVerified,
    role: user.role,
    createdAt: user.createdAt?.toISOString(),
  };
};

const buildConsultationOptions = (doctor) => {
  const fee = doctor.consultationFee ?? 0;
  const currency = doctor.currency || 'PKR';
  const doctorId = doctor._id.toString();

  const options = [
    {
      id: `${doctorId}-video`,
      type: 'video',
      name: 'Video Consultation',
      fee,
      currency,
      hours: '04:30 PM - 09:30 PM',
      status: 'Online',
    },
  ];

  if (doctor.city) {
    options.push({
      id: `${doctorId}-clinic`,
      type: 'clinic',
      name: `${doctor.city} Clinic`,
      location: doctor.city,
      fee,
      currency,
      hours: '10:00 AM - 07:00 PM',
      status: 'In Clinic',
    });
  }

  return options;
};

const toDoctorSearchResult = (doctor) => ({
  id: doctor._id.toString(),
  userId: doctor.userId?._id?.toString() || doctor.userId?.toString(),
  user: doctor.userId?.firstName
    ? {
        id: doctor.userId._id.toString(),
        firstName: doctor.userId.firstName,
        lastName: doctor.userId.lastName,
      }
    : undefined,
  gender: doctor.gender,
  city: doctor.city,
  country: 'Pakistan',
  title: doctor.title,
  yearsOfExperience: doctor.yearsOfExperience,
  consultationFee: doctor.consultationFee,
  currency: doctor.currency,
  profileImageUrl: doctor.profileImageUrl,
  about: doctor.about,
  qualifications: (doctor.qualifications || []).map(toQualificationResponse),
  specialtyIds: (doctor.specialtyIds || []).map((s) =>
    s?._id ? s._id.toString() : s?.toString(),
  ),
  specialties: (doctor.specialtyIds || [])
    .map(toSpecialtyResponse)
    .filter(Boolean),
  languageIds: (doctor.languageIds || []).map((l) => (l?._id ? l._id.toString() : l?.toString())),
  languages: (doctor.languageIds || []).map(toLanguageResponse).filter(Boolean),
  clinics: doctor.city
    ? [{ id: `${doctor._id.toString()}-clinic`, name: `${doctor.city} Clinic`, city: doctor.city }]
    : [],
  availableDays: [1, 2, 3, 4, 5],
});

const toDoctorDetailProfile = (doctor) => {
  const base = toDoctorSearchResult(doctor);
  const rating = doctor.averageRating || 0;

  return {
    ...base,
    role: doctor.title ? `${doctor.title}` : 'Consultant',
    averageRating: rating,
    reviewCount: doctor.reviewCount || 0,
    waitTimeMins: 10,
    avgTimeToPatientMins: 25,
    ratingBreakdown: {
      patientSatisfaction: rating || 4.5,
      diagnosis: rating || 4.5,
      staffBehaviour: rating || 4.5,
      clinicEnvironment: rating || 4.5,
    },
    reviews: [],
    consultationOptions: buildConsultationOptions(doctor),
    timeSlots: DEFAULT_TIME_SLOTS,
  };
};

const toDoctorProfile = (doctor) => ({
  id: doctor._id.toString(),
  userId: doctor.userId?._id?.toString() || doctor.userId?.toString(),
  user: toUserSummary(doctor.userId),
  title: doctor.title,
  gender: doctor.gender,
  dateOfBirth: doctor.dateOfBirth?.toISOString(),
  city: doctor.city,
  bio: doctor.bio,
  about: doctor.about,
  yearsOfExperience: doctor.yearsOfExperience,
  licenseNumber: doctor.licenseNumber,
  licenseAuthority: doctor.licenseAuthority,
  medicalRegistrationNumber: doctor.medicalRegistrationNumber,
  qualifications: (doctor.qualifications || []).map(toQualificationResponse),
  workHistory: (doctor.workHistory || []).map(toWorkHistoryResponse),
  specialtyIds: (doctor.specialtyIds || []).map((s) =>
    s?._id ? s._id.toString() : s?.toString(),
  ),
  specialties: (doctor.specialtyIds || []).map(toSpecialtyResponse).filter(Boolean),
  languageIds: (doctor.languageIds || []).map((l) => (l?._id ? l._id.toString() : l?.toString())),
  languages: (doctor.languageIds || []).map(toLanguageResponse).filter(Boolean),
  consultationFee: doctor.consultationFee,
  currency: doctor.currency,
  verificationStatus: doctor.verificationStatus,
  rejectionReason: doctor.rejectionReason,
  profileImageUrl: doctor.profileImageUrl,
  averageRating: doctor.averageRating,
  reviewCount: doctor.reviewCount,
  createdAt: doctor.createdAt?.toISOString(),
  updatedAt: doctor.updatedAt?.toISOString(),
});

const resolveSpecialtyFilter = async (query) => {
  const specialtyParam = query.specialty || query.specialtySlug;
  if (!specialtyParam) return null;

  if (doctorsRepository.isValidObjectId(specialtyParam)) {
    return specialtyParam;
  }

  const specialty = await MedicalSpecialty.findOne({
    slug: specialtyParam.toLowerCase(),
    isActive: true,
  });

  return specialty?._id || null;
};

const buildPublicSearchFilter = async (query) => {
  const filter = {};
  const specialtyId = await resolveSpecialtyFilter(query);

  if (query.specialty || query.specialtySlug) {
    if (!specialtyId) {
      return { impossible: true };
    }
    filter.specialtyIds = specialtyId;
  }

  if (query.city) {
    filter.city = new RegExp(`^${query.city.trim()}$`, 'i');
  }

  const searchTerm = (query.search || query.name || '').trim();
  if (searchTerm) {
    filter.$text = { $search: searchTerm };
  }

  const minFee = query.minFee !== undefined && query.minFee !== '' ? Number(query.minFee) : null;
  const maxFee = query.maxFee !== undefined && query.maxFee !== '' ? Number(query.maxFee) : null;

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
    filter.$text = { $search: searchTerm };
  }

  return filter;
};

const ensureDoctorProfile = async (userId) => {
  const existing = await doctorsRepository.findByUserId(userId);
  if (existing) return existing;

  const user = await doctorsRepository.findUserById(userId);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  if (user.role !== 'DOCTOR') {
    throw new AppError('Only doctors can access this profile', 403);
  }

  await doctorsRepository.create({
    userId: user._id,
    firstName: user.firstName,
    lastName: user.lastName,
    fullName: `${user.firstName} ${user.lastName}`.trim(),
    specialtyIds: [],
    languageIds: [],
    qualifications: [],
    workHistory: [],
    currency: 'PKR',
    verificationStatus: 'PENDING',
  });

  return doctorsRepository.findByUserId(userId);
};

const searchPublic = async (query) => {
  const { page, limit, skip, sort } = parsePaginationQuery(
    query,
    PUBLIC_SORT_FIELDS,
    'yearsOfExperience',
    12,
  );

  const filter = await buildPublicSearchFilter(query);

  if (filter.impossible) {
    return {
      doctors: [],
      pagination: buildPaginationMeta(page, limit, 0),
    };
  }

  delete filter.impossible;

  const [doctors, total] = await Promise.all([
    doctorsRepository.searchVerified(filter, { skip, limit, sort }),
    doctorsRepository.countVerified(filter),
  ]);

  return {
    doctors: doctors.map(toDoctorSearchResult),
    pagination: buildPaginationMeta(page, limit, total),
  };
};

const getPublicById = async (id) => {
  if (!doctorsRepository.isValidObjectId(id)) {
    throw new AppError('Doctor not found', 404);
  }

  const doctor = await doctorsRepository.findVerifiedById(id);
  if (!doctor) {
    throw new AppError('Doctor not found', 404);
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
    updates.profileImageUrl = undefined;
  }

  if (payload.qualifications) {
    updates.qualifications = payload.qualifications.map((q) => ({
      degree: q.degree,
      institute: q.institute,
      year: q.year,
    }));
  }

  delete updates.verificationStatus;
  delete updates.rejectionReason;
  delete updates.averageRating;
  delete updates.reviewCount;

  const doctor = await doctorsRepository.updateByUserId(userId, updates);
  if (!doctor) {
    throw new AppError('Doctor profile not found', 404);
  }

  return { doctor: toDoctorProfile(doctor) };
};

const listAdmin = async (query) => {
  const { page, limit, skip, sort } = parsePaginationQuery(
    query,
    ADMIN_SORT_FIELDS,
    'createdAt',
    10,
  );

  const filter = buildAdminSearchFilter(query);

  const [doctors, total] = await Promise.all([
    doctorsRepository.searchAdmin(filter, { skip, limit, sort }),
    doctorsRepository.countAdmin(filter),
  ]);

  return {
    doctors: doctors.map(toDoctorProfile),
    pagination: buildPaginationMeta(page, limit, total),
  };
};

const updateVerification = async (id, { status, rejectionReason }) => {
  if (!doctorsRepository.isValidObjectId(id)) {
    throw new AppError('Doctor not found', 404);
  }

  if (status === 'REJECTED' && !rejectionReason?.trim()) {
    throw new AppError('Rejection reason is required when status is REJECTED', 422);
  }

  const updates = {
    verificationStatus: status,
    rejectionReason: status === 'REJECTED' ? rejectionReason.trim() : '',
  };

  const doctor = await doctorsRepository.updateVerificationStatus(id, updates);
  if (!doctor) {
    throw new AppError('Doctor not found', 404);
  }

  return { doctor: toDoctorProfile(doctor) };
};

module.exports = {
  searchPublic,
  getPublicById,
  getMyProfile,
  updateMyProfile,
  listAdmin,
  updateVerification,
};

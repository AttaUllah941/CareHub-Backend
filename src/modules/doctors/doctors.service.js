const { NotFoundError } = require('../../core/errors/AppError');
const { parsePaginationQuery, buildPaginationMeta } = require('../../core/utils/pagination.util');
const { User } = require('../users/users.model');
const { Specialty } = require('../specialties/specialties.model');
const { Language } = require('../languages/languages.model');
const doctorsRepository = require('./doctors.repository');

const SEARCH_SORT_FIELDS = ['yearsOfExperience', 'averageRating', 'fullName', 'createdAt'];

const LEGACY_SPECIALTY_SLUG_MAP = {
  cardiology: 'cardiologist',
  dermatology: 'dermatologist',
  'general-medicine': 'general-physician',
  gynecology: 'gynecologist-obstetrician-obgyn',
  pediatrics: 'pediatrician',
};

const DEFAULT_TIME_SLOTS = [
  '09:00 AM',
  '10:00 AM',
  '11:00 AM',
  '12:00 PM',
  '02:00 PM',
  '03:00 PM',
  '04:00 PM',
  '05:00 PM',
  '06:00 PM',
];

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const resolveSpecialtySlug = (slug) => {
  if (!slug) return '';
  const normalized = slug.trim().toLowerCase();
  return LEGACY_SPECIALTY_SLUG_MAP[normalized] ?? normalized;
};

const toSpecialtyResponse = (specialty) => ({
  id: specialty._id.toString(),
  name: specialty.name,
  slug: specialty.slug,
  description: specialty.description || '',
  icon: specialty.icon || '',
  isActive: specialty.isActive,
});

const toLanguageResponse = (language) => ({
  id: language._id.toString(),
  name: language.name,
  code: language.code,
  isActive: language.isActive,
});

const toUserSummary = (user) => {
  if (!user) return undefined;

  return {
    id: user._id.toString(),
    firstName: user.firstName,
    lastName: user.lastName,
  };
};

const buildConsultationOptions = (doctor) => {
  const fee = doctor.consultationFee ?? 1500;
  const currency = doctor.currency ?? 'PKR';
  const doctorId = doctor._id.toString();

  return [
    {
      id: `${doctorId}-video`,
      type: 'video',
      name: 'Video Consultation',
      fee,
      currency,
      hours: '9:00 AM - 9:00 PM',
      status: 'Available',
    },
    {
      id: `${doctorId}-clinic`,
      type: 'clinic',
      name: doctor.city ? `${doctor.city} Clinic` : 'Clinic Visit',
      location: doctor.city || 'Pakistan',
      fee: fee + 500,
      currency,
      hours: '9:00 AM - 9:00 PM',
      status: 'Available',
    },
  ];
};

const buildRatingBreakdown = (averageRating = 0) => ({
  patientSatisfaction: averageRating,
  diagnosis: Math.max(0, averageRating - 0.1),
  staffBehaviour: Math.min(5, averageRating + 0.1),
  clinicEnvironment: averageRating,
});

const mapDoctorRecord = (doctor, { usersById, specialtiesById, languagesById, includeDetail = false }) => {
  const user = usersById.get(doctor.userId.toString());
  const specialties = (doctor.specialtyIds ?? [])
    .map((id) => specialtiesById.get(id.toString()))
    .filter(Boolean)
    .map(toSpecialtyResponse);
  const languages = (doctor.languageIds ?? [])
    .map((id) => languagesById.get(id.toString()))
    .filter(Boolean)
    .map(toLanguageResponse);

  const response = {
    id: doctor._id.toString(),
    userId: doctor.userId.toString(),
    user: toUserSummary(user),
    gender: doctor.gender,
    city: doctor.city,
    country: doctor.country,
    title: doctor.title,
    yearsOfExperience: doctor.yearsOfExperience ?? 0,
    consultationFee: doctor.consultationFee ?? 0,
    currency: doctor.currency ?? 'PKR',
    profileImageUrl: doctor.profileImageUrl || '',
    about: doctor.about || '',
    qualifications: doctor.qualifications ?? [],
    specialtyIds: (doctor.specialtyIds ?? []).map((id) => id.toString()),
    specialties,
    languageIds: (doctor.languageIds ?? []).map((id) => id.toString()),
    languages,
    clinics: doctor.city
      ? [{ id: `${doctor._id}-clinic`, name: `${doctor.city} Clinic`, city: doctor.city }]
      : [],
    availableDays: [1, 2, 3, 4, 5],
    averageRating: doctor.averageRating ?? 0,
    reviewCount: doctor.reviewCount ?? 0,
  };

  if (includeDetail) {
    const averageRating = doctor.averageRating ?? 0;
    return {
      ...response,
      averageRating,
      reviewCount: doctor.reviewCount ?? 0,
      waitTimeMins: 10 + ((doctor._id.toString().charCodeAt(0) ?? 3) % 4) * 5,
      avgTimeToPatientMins: 12,
      ratingBreakdown: buildRatingBreakdown(averageRating),
      reviews: [],
      consultationOptions: buildConsultationOptions(doctor),
      timeSlots: DEFAULT_TIME_SLOTS,
    };
  }

  return response;
};

const loadReferenceMaps = async (doctors) => {
  const userIds = [...new Set(doctors.map((doctor) => doctor.userId.toString()))];
  const specialtyIds = [
    ...new Set(doctors.flatMap((doctor) => (doctor.specialtyIds ?? []).map((id) => id.toString()))),
  ];
  const languageIds = [
    ...new Set(doctors.flatMap((doctor) => (doctor.languageIds ?? []).map((id) => id.toString()))),
  ];

  const [users, specialties, languages] = await Promise.all([
    userIds.length ? User.find({ _id: { $in: userIds } }).lean() : [],
    specialtyIds.length ? Specialty.find({ _id: { $in: specialtyIds } }).lean() : [],
    languageIds.length ? Language.find({ _id: { $in: languageIds } }).lean() : [],
  ]);

  return {
    usersById: new Map(users.map((user) => [user._id.toString(), user])),
    specialtiesById: new Map(specialties.map((specialty) => [specialty._id.toString(), specialty])),
    languagesById: new Map(languages.map((language) => [language._id.toString(), language])),
  };
};

const buildSearchFilter = async (query) => {
  const filter = { verificationStatus: 'VERIFIED', isActive: true };

  if (query.city?.trim()) {
    filter.city = new RegExp(`^${escapeRegex(query.city.trim())}$`, 'i');
  }

  const specialtySlug = resolveSpecialtySlug(query.specialtySlug);
  if (specialtySlug) {
    const specialty = await Specialty.findOne({ slug: specialtySlug, isActive: true }).lean();
    if (!specialty) {
      return { filter: null };
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

    filter.$or = [{ fullName: regex }];
    if (userIds.length) {
      filter.$or.push({ userId: { $in: userIds } });
    }
  }

  if (query.maxFee) {
    const maxFee = Number(query.maxFee);
    if (!Number.isNaN(maxFee) && maxFee > 0) {
      filter.consultationFee = { $lte: maxFee };
    }
  }

  return { filter };
};

const searchPublicDoctors = async (query) => {
  const { page, limit, skip, sort } = parsePaginationQuery(query, SEARCH_SORT_FIELDS);
  const { filter } = await buildSearchFilter(query);

  if (!filter) {
    return {
      doctors: [],
      pagination: buildPaginationMeta(page, limit, 0),
    };
  }

  const [doctors, total] = await doctorsRepository.searchVerified({ filter, sort, skip, limit });
  const referenceMaps = await loadReferenceMaps(doctors);

  return {
    doctors: doctors.map((doctor) => mapDoctorRecord(doctor, { ...referenceMaps })),
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

  const referenceMaps = await loadReferenceMaps([doctor]);

  return {
    doctor: mapDoctorRecord(doctor, { ...referenceMaps, includeDetail: true }),
  };
};

module.exports = {
  searchPublicDoctors,
  getPublicDoctorById,
};

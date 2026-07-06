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

const toSpecialtyResponse = (specialty) => {
  if (!specialty) return null;
  const id = specialty._id ? specialty._id.toString() : specialty.id;
  return {
    id,
    name: specialty.name,
    slug: specialty.slug,
    description: specialty.description || '',
    icon: specialty.icon || '',
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
  degree: qualification.degree || '',
  institution: qualification.institution || qualification.institute || '',
  year: qualification.year,
});

const toUserSummary = (doctor) => {
  const user = doctor.userId;
  if (!user?.firstName) return undefined;

  return {
    id: user._id.toString(),
    firstName: user.firstName,
    lastName: user.lastName,
  };
};

const buildConsultationOptions = (doctor) => {
  const fee = doctor.consultationFee ?? 1500;
  const currency = doctor.currency || 'PKR';
  const doctorId = doctor._id.toString();

  const options = [
    {
      id: `${doctorId}-video`,
      type: 'video',
      name: 'Video Consultation',
      fee,
      currency,
      hours: '9:00 AM - 9:00 PM',
      status: 'Available',
    },
  ];

  if (doctor.city) {
    options.push({
      id: `${doctorId}-clinic`,
      type: 'clinic',
      name: `${doctor.city} Clinic`,
      location: doctor.city,
      fee: fee + 500,
      currency,
      hours: '10:00 AM - 7:00 PM',
      status: 'Available',
    });
  }

  return options;
};

const toDoctorSearchResult = (doctor) => {
  const userId = doctor.userId?._id?.toString() || doctor.userId?.toString();
  const specialties = (doctor.specialtyIds || []).map(toSpecialtyResponse).filter(Boolean);
  const languages = (doctor.languageIds || []).map(toLanguageResponse).filter(Boolean);

  return {
    id: doctor._id.toString(),
    userId,
    user: toUserSummary(doctor),
    gender: doctor.gender,
    city: doctor.city,
    country: doctor.country || 'Pakistan',
    title: doctor.title || '',
    yearsOfExperience: doctor.yearsOfExperience ?? 0,
    consultationFee: doctor.consultationFee ?? 0,
    currency: doctor.currency || 'PKR',
    profileImageUrl: doctor.profileImageUrl || '',
    about: doctor.about || '',
    qualifications: (doctor.qualifications || []).map(toQualificationResponse),
    specialtyIds: specialties.map((item) => item.id),
    specialties,
    languageIds: languages.map((item) => item.id),
    languages,
    clinics: doctor.city
      ? [{ id: `${doctor._id.toString()}-clinic`, name: `${doctor.city} Clinic`, city: doctor.city }]
      : [],
    availableDays: [1, 2, 3, 4, 5],
    averageRating: doctor.averageRating ?? 0,
    reviewCount: doctor.reviewCount ?? 0,
  };
};

const toDoctorDetailProfile = (doctor) => {
  const base = toDoctorSearchResult(doctor);
  const rating = doctor.averageRating ?? 0;

  return {
    ...base,
    role: doctor.title || 'Consultant',
    averageRating: rating,
    reviewCount: doctor.reviewCount ?? 0,
    waitTimeMins: 10 + ((doctor._id.toString().charCodeAt(0) ?? 3) % 4) * 5,
    avgTimeToPatientMins: 12,
    ratingBreakdown: {
      patientSatisfaction: rating,
      diagnosis: Math.max(0, rating - 0.1),
      staffBehaviour: Math.min(5, rating + 0.1),
      clinicEnvironment: rating,
    },
    reviews: [],
    consultationOptions: buildConsultationOptions(doctor),
    timeSlots: DEFAULT_TIME_SLOTS,
  };
};

module.exports = {
  DEFAULT_TIME_SLOTS,
  toDoctorSearchResult,
  toDoctorDetailProfile,
};

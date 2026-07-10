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

const buildClinicsList = (doctor, { clinics = [], hospitals = [] } = {}) => {
  const items = clinics.map((clinic) => ({
    id: clinic._id.toString(),
    name: clinic.name,
    city: clinic.city,
    address: clinic.address || '',
    facilityType: 'clinic',
  }));

  hospitals.forEach((hospital) => {
    items.push({
      id: `hospital-${hospital._id.toString()}`,
      name: hospital.name,
      city: hospital.city,
      address: hospital.address || '',
      facilityType: 'hospital',
    });
  });

  if (!items.length && doctor.city) {
    items.push({
      id: `${doctor._id.toString()}-clinic-fallback`,
      name: `${doctor.city} Clinic`,
      city: doctor.city,
      address: '',
      facilityType: 'clinic',
    });
  }

  return items;
};

const buildConsultationOptions = (doctor, { clinics = [], hospitals = [] } = {}) => {
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

  clinics.forEach((clinic) => {
    options.push({
      id: clinic._id.toString(),
      type: 'clinic',
      name: clinic.name,
      address: clinic.address || '',
      location: clinic.city,
      facilityType: 'clinic',
      fee: clinic.consultationFee ?? fee + 500,
      currency,
      hours: '10:00 AM - 7:00 PM',
      status: 'Available',
    });
  });

  hospitals.forEach((hospital) => {
    options.push({
      id: `hospital-${hospital._id.toString()}`,
      type: 'clinic',
      name: hospital.name,
      address: hospital.address || '',
      location: hospital.city,
      facilityType: 'hospital',
      fee: fee + 500,
      currency,
      hours: '10:00 AM - 7:00 PM',
      status: 'Available',
    });
  });

  if (!clinics.length && !hospitals.length && doctor.city) {
    options.push({
      id: `${doctorId}-clinic-fallback`,
      type: 'clinic',
      name: `${doctor.city} Clinic`,
      address: '',
      location: doctor.city,
      facilityType: 'clinic',
      fee: fee + 500,
      currency,
      hours: '10:00 AM - 7:00 PM',
      status: 'Available',
    });
  }

  return options;
};

const toDoctorSearchResult = (doctor, { clinics = [], hospitals = [] } = {}) => {
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
    clinics: buildClinicsList(doctor, { clinics, hospitals }),
    availableDays: [1, 2, 3, 4, 5],
    averageRating: doctor.averageRating ?? 0,
    reviewCount: doctor.reviewCount ?? 0,
  };
};

const toDoctorDetailProfile = (doctor, { clinics = [], hospitals = [] } = {}) => {
  const base = toDoctorSearchResult(doctor, { clinics, hospitals });
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
    consultationOptions: buildConsultationOptions(doctor, { clinics, hospitals }),
    timeSlots: DEFAULT_TIME_SLOTS,
  };
};

module.exports = {
  DEFAULT_TIME_SLOTS,
  toDoctorSearchResult,
  toDoctorDetailProfile,
};

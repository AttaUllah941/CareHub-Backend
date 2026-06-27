const DEFAULT_TIME_SLOTS = ['04:30 PM', '05:00 PM', '05:30 PM', '06:00 PM', '06:30 PM', '07:00 PM'];

const splitFullName = (fullName) => {
  const parts = (fullName || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: '', lastName: '' };
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
};

const toSpecialtyChip = (specialty) => {
  if (!specialty) return null;
  return {
    id: specialty._id.toString(),
    name: specialty.name,
    slug: specialty.slug,
    description: specialty.description,
    isActive: specialty.isActive,
  };
};

const matchSpecialtyForDoctor = (doctor, specialties) => {
  const title = (doctor.title || '').toLowerCase();
  if (!title) return null;

  return (
    specialties.find((specialty) => {
      const name = specialty.name.toLowerCase();
      const slugWords = specialty.slug.replace(/-/g, ' ');
      return title.includes(name) || title.includes(slugWords) || name.includes(title.replace(/ist$|ian$|logist$/, ''));
    }) ?? null
  );
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

const toDoctorSearchResult = (doctor, specialty = null) => {
  const user = doctor.userId?.firstName ? doctor.userId : null;
  const userId = user?._id?.toString() || doctor.userId?.toString();
  const { firstName, lastName } = user
    ? { firstName: user.firstName, lastName: user.lastName }
    : splitFullName(doctor.fullName);
  const specialtyChip = toSpecialtyChip(specialty);

  return {
    id: doctor._id.toString(),
    userId,
    user: { id: userId, firstName, lastName },
    city: doctor.city,
    country: 'Pakistan',
    title: doctor.title || '',
    yearsOfExperience: doctor.yearsOfExperience ?? 10,
    consultationFee: doctor.consultationFee ?? 1500,
    currency: doctor.currency || 'PKR',
    averageRating: doctor.averageRating ?? 0,
    reviewCount: doctor.reviewCount ?? 0,
    about: doctor.about || '',
    qualifications: doctor.qualifications || [],
    specialtyIds: specialtyChip ? [specialtyChip.id] : [],
    specialties: specialtyChip ? [specialtyChip] : [],
    languageIds: [],
    languages: [],
    clinics: doctor.city
      ? [{ id: `${doctor._id.toString()}-clinic`, name: `${doctor.city} Clinic`, city: doctor.city }]
      : [],
    availableDays: [1, 2, 3, 4, 5],
  };
};

const toDoctorDetailProfile = (doctor, specialty = null) => {
  const base = toDoctorSearchResult(doctor, specialty);
  const rating = doctor.averageRating || 0;

  return {
    ...base,
    role: doctor.title || 'Consultant',
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

module.exports = {
  DEFAULT_TIME_SLOTS,
  matchSpecialtyForDoctor,
  toDoctorSearchResult,
  toDoctorDetailProfile,
};

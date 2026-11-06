const { z } = require('zod');
const doctorsService = require('../../doctors/doctors.service');
const reviewsService = require('../../reviews/reviews.service');
const specialtiesService = require('../../specialties/specialties.service');
const { defineTool } = require('./tool.registry');
const {
  citySchema,
  searchTextSchema,
  objectId,
  limitSchema,
  truncate,
} = require('./tool.helpers');

const SORT_FIELD = { rating: 'averageRating', fee: 'consultationFee', experience: 'yearsOfExperience' };

const doctorName = (doctor) => {
  const full = `${doctor.user?.firstName || ''} ${doctor.user?.lastName || ''}`.trim();
  return full ? `Dr. ${full}` : doctor.title || 'Doctor';
};

/** Compact doctor shape: small enough for the model context and the UI card. */
const compactDoctor = (doctor) => ({
  id: doctor.id,
  name: doctorName(doctor),
  specialties: (doctor.specialties || []).map((item) => item.name),
  city: doctor.city,
  consultationFee: doctor.consultationFee,
  currency: doctor.currency,
  averageRating: doctor.averageRating,
  reviewCount: doctor.reviewCount,
  yearsOfExperience: doctor.yearsOfExperience,
  profileImageUrl: doctor.profileImageUrl || '',
  clinic: doctor.clinics?.[0]
    ? { name: doctor.clinics[0].name, address: doctor.clinics[0].address }
    : null,
});

/** Resolves a free-text specialty ("cardiologist", "skin") to an existing catalog entry. */
const resolveSpecialty = async (term) => {
  const { specialties } = await specialtiesService.listPublic();
  const needle = term.trim().toLowerCase();
  const exact = specialties.find(
    (item) => item.slug === needle || item.name.toLowerCase() === needle,
  );
  if (exact) return { match: exact, all: specialties };
  const partial = specialties.find(
    (item) => item.name.toLowerCase().includes(needle) || needle.includes(item.name.toLowerCase()),
  );
  return { match: partial || null, all: specialties };
};

const searchDoctors = defineTool({
  name: 'searchDoctors',
  agent: 'PATIENT',
  intent: 'doctors',
  description:
    'Search verified doctors on CareHub by specialty, city, name, fee range, minimum rating or experience. ' +
    'Use this for any request to find, list, compare or recommend doctors, including follow-ups like "cheaper ones".',
  schema: z.object({
    specialty: searchTextSchema.optional().describe('Specialty name, e.g. "cardiologist" or "dermatologist"'),
    city: citySchema.optional(),
    name: searchTextSchema.optional().describe('Doctor name'),
    minFee: z.number().min(0).optional().describe('Minimum consultation fee in PKR'),
    maxFee: z.number().min(0).optional().describe('Maximum consultation fee in PKR'),
    minRating: z.number().min(0).max(5).optional(),
    minExperienceYears: z.number().int().min(0).max(60).optional(),
    sortBy: z.enum(['rating', 'fee', 'experience']).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
    limit: limitSchema(8, 5),
  }),
  execute: async (args, ctx) => {
    const limit = args.limit ?? 5;
    let specialtyMatch = null;

    if (args.specialty) {
      const { match, all } = await resolveSpecialty(args.specialty);
      if (!match) {
        return {
          data: {
            error: `No specialty matching "${args.specialty}" exists on CareHub.`,
            availableSpecialties: all.map((item) => item.name),
          },
        };
      }
      specialtyMatch = match;
    }

    const needsPostFilter = args.minRating != null || args.minExperienceYears != null;
    const result = await doctorsService.searchPublicDoctors({
      city: args.city,
      specialtySlug: specialtyMatch?.slug,
      name: args.name,
      minFee: args.minFee,
      maxFee: args.maxFee,
      sortBy: SORT_FIELD[args.sortBy],
      sortOrder: args.sortOrder || (args.sortBy === 'fee' ? 'asc' : 'desc'),
      page: 1,
      limit: needsPostFilter ? 40 : limit,
    });

    let doctors = result.doctors;
    if (args.minRating != null) doctors = doctors.filter((d) => d.averageRating >= args.minRating);
    if (args.minExperienceYears != null) {
      doctors = doctors.filter((d) => d.yearsOfExperience >= args.minExperienceYears);
    }
    doctors = doctors.slice(0, limit).map(compactDoctor);

    const fees = doctors.map((doctor) => doctor.consultationFee);
    const filters = {
      specialty: specialtyMatch?.name || null,
      city: args.city || null,
      name: args.name || null,
      maxFee: args.maxFee ?? null,
      minFee: args.minFee ?? null,
      minRating: args.minRating ?? null,
    };

    return {
      data: {
        total: doctors.length,
        filters,
        doctors: doctors.map(({ profileImageUrl, ...rest }) => rest),
        note: doctors.length ? undefined : 'No doctors matched. Suggest relaxing a filter.',
      },
      actions: doctors.length ? [{ type: 'DOCTOR_RESULTS', data: { doctors, filters } }] : [],
      // Working memory so follow-ups ("show cheaper ones") know what was just searched.
      context: {
        lastDoctorSearch: {
          ...filters,
          resultCount: doctors.length,
          lowestFee: fees.length ? Math.min(...fees) : null,
          highestFee: fees.length ? Math.max(...fees) : null,
          doctors: doctors.map(({ id, name, consultationFee }) => ({ id, name, consultationFee })),
        },
      },
    };
  },
});

const getDoctorProfile = defineTool({
  name: 'getDoctorProfile',
  agent: 'PATIENT',
  intent: 'doctors',
  description: 'Get the public profile of one doctor: qualifications, fee, rating, clinics and languages.',
  schema: z.object({ doctorId: objectId('doctorId') }),
  execute: async ({ doctorId }) => {
    const { doctor } = await doctorsService.getPublicDoctorById(doctorId);
    const compact = compactDoctor(doctor);
    const detail = {
      ...compact,
      about: truncate(doctor.about, 600),
      qualifications: (doctor.qualifications || []).map((q) => `${q.degree}${q.institution ? `, ${q.institution}` : ''}`),
      languages: (doctor.languages || []).map((language) => language.name),
      clinics: (doctor.clinics || []).map((clinic) => ({
        name: clinic.name,
        address: clinic.address,
        city: clinic.city,
      })),
    };
    return {
      data: detail,
      actions: [{ type: 'DOCTOR_RESULTS', data: { doctors: [compact], filters: {} } }],
    };
  },
});

const getDoctorReviews = defineTool({
  name: 'getDoctorReviews',
  agent: 'PATIENT',
  intent: 'doctors',
  description: 'Get the most recent patient reviews for a doctor.',
  schema: z.object({ doctorId: objectId('doctorId'), limit: limitSchema(8, 5) }),
  execute: async ({ doctorId, limit }) => {
    const { reviews } = await reviewsService.listDoctorReviews(doctorId, {
      page: 1,
      limit: limit ?? 5,
      sortBy: 'date',
      sortOrder: 'desc',
    });
    return {
      data: {
        reviews: reviews.map((review) => ({
          rating: review.rating,
          headline: review.headline,
          body: truncate(review.body, 300),
          date: review.date,
        })),
      },
    };
  },
});

module.exports = [searchDoctors, getDoctorProfile, getDoctorReviews];

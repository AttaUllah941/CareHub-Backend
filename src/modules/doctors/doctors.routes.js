const { Router } = require('express');
const { successResponse } = require('../../core/utils/apiResponse');
const asyncHandler = require('../../core/utils/asyncHandler');
const { parsePaginationQuery, buildPaginationMeta } = require('../../core/utils/pagination.util');
const { validate } = require('../../shared/middleware/validate.middleware');
const { z } = require('zod');
const { paginationQuerySchema, objectIdSchema } = require('../../shared/utils/zodSchemas');
const { NotFoundError } = require('../../core/errors/AppError');
const { Doctor } = require('./doctors.model');
const { Specialty } = require('../specialties/specialties.model');
const {
  matchSpecialtyForDoctor,
  toDoctorSearchResult,
  toDoctorDetailProfile,
} = require('./doctors.public.mapper');

const router = Router();

const PUBLIC_SORT_FIELDS = [
  'averageRating',
  'reviewCount',
  'yearsOfExperience',
  'consultationFee',
  'createdAt',
  'fullName',
];

const searchQuerySchema = paginationQuerySchema.extend({
  city: z.string().trim().optional(),
  specialtySlug: z.string().trim().optional(),
  search: z.string().trim().optional(),
  name: z.string().trim().optional(),
  minFee: z.coerce.number().min(0).optional(),
  maxFee: z.coerce.number().min(0).optional(),
});

const doctorIdParamsSchema = z.object({
  id: objectIdSchema('doctor id'),
});

const loadActiveSpecialties = async () =>
  Specialty.find({ isActive: true }).select('name slug description isActive').lean();

const resolveSpecialtyBySlug = async (slug) => {
  if (!slug) return null;
  return Specialty.findOne({ slug: slug.toLowerCase(), isActive: true }).lean();
};

const titleMatchesSpecialty = (doctor, specialty) => {
  if (!specialty) return true;
  const title = (doctor.title || '').toLowerCase();
  const name = specialty.name.toLowerCase();
  const slugWords = specialty.slug.replace(/-/g, ' ');
  return title.includes(name) || title.includes(slugWords);
};

const buildSearchFilter = async (query) => {
  const filter = { verificationStatus: 'VERIFIED' };

  if (query.city?.trim()) {
    filter.city = new RegExp(`^${query.city.trim()}$`, 'i');
  }

  const searchTerm = (query.search || query.name || '').trim();
  if (searchTerm) {
    const escaped = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [
      { fullName: new RegExp(escaped, 'i') },
      { title: new RegExp(escaped, 'i') },
    ];
  }

  if (query.minFee != null) {
    filter.consultationFee = { ...(filter.consultationFee || {}), $gte: query.minFee };
  }

  if (query.maxFee != null) {
    filter.consultationFee = { ...(filter.consultationFee || {}), $lte: query.maxFee };
  }

  return filter;
};

/**
 * @openapi
 * /doctors/public/search:
 *   get:
 *     tags: [Doctors]
 *     summary: Search verified doctors
 */
router.get(
  '/public/search',
  validate(searchQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { page, limit, skip, sort } = parsePaginationQuery(req.query, PUBLIC_SORT_FIELDS);

    const filter = await buildSearchFilter(req.query);
    const specialty = await resolveSpecialtyBySlug(req.query.specialtySlug);
    const specialties = await loadActiveSpecialties();

    let doctors = await Doctor.find(filter)
      .populate('userId', 'firstName lastName email phone isActive')
      .sort(sort || { averageRating: -1 })
      .lean();

    if (specialty) {
      doctors = doctors.filter((doctor) => titleMatchesSpecialty(doctor, specialty));
    }

    const total = doctors.length;
    const pageItems = doctors.slice(skip, skip + limit);

    successResponse(
      res,
      {
        doctors: pageItems.map((doctor) =>
          toDoctorSearchResult(doctor, matchSpecialtyForDoctor(doctor, specialties)),
        ),
        pagination: buildPaginationMeta(page, limit, total),
      },
      'Doctors retrieved',
    );
  }),
);

/**
 * @openapi
 * /doctors/public/{id}:
 *   get:
 *     tags: [Doctors]
 *     summary: Get verified doctor public profile
 */
router.get(
  '/public/:id',
  validate(doctorIdParamsSchema, 'params'),
  asyncHandler(async (req, res) => {
    const doctor = await Doctor.findOne({
      _id: req.params.id,
      verificationStatus: 'VERIFIED',
    })
      .populate('userId', 'firstName lastName email phone isActive')
      .lean();

    if (!doctor) {
      throw new NotFoundError('Doctor not found');
    }

    const specialties = await loadActiveSpecialties();
    const specialty = matchSpecialtyForDoctor(doctor, specialties);

    successResponse(
      res,
      { doctor: toDoctorDetailProfile(doctor, specialty) },
      'Doctor retrieved',
    );
  }),
);

module.exports = router;

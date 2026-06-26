const { Router } = require('express');
const { successResponse } = require('../../core/utils/apiResponse');
const asyncHandler = require('../../core/utils/asyncHandler');
const { parsePaginationQuery, buildPaginationMeta } = require('../../core/utils/pagination.util');
const { validate } = require('../../shared/middleware/validate.middleware');
const { z } = require('zod');
const { paginationQuerySchema } = require('../../shared/utils/zodSchemas');

const router = Router();

const searchQuerySchema = paginationQuerySchema.extend({
  city: z.string().trim().optional(),
  specialtySlug: z.string().trim().optional(),
  search: z.string().trim().optional(),
});

const toDoctorListing = (doctor) => ({
  id: doctor._id.toString(),
  fullName: doctor.fullName,
  verificationStatus: doctor.verificationStatus,
  averageRating: doctor.averageRating,
  reviewCount: doctor.reviewCount,
});

/**
 * @openapi
 * /doctors/public/search:
 *   get:
 *     tags: [Doctors]
 *     summary: Search verified doctors
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *       - in: query
 *         name: specialtySlug
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Paginated doctor search results
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiSuccessResponse'
 */
router.get(
  '/public/search',
  validate(searchQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = parsePaginationQuery(req.query, ['fullName', 'createdAt']);
    const filter = { verificationStatus: 'VERIFIED' };

    if (req.query.city) {
      filter.city = new RegExp(`^${req.query.city.trim()}$`, 'i');
    }

    if (req.query.search?.trim()) {
      const term = req.query.search.trim();
      filter.fullName = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    }

    const { Doctor } = require('../doctors/doctors.model');
    const [doctors, total] = await Promise.all([
      Doctor.find(filter).sort({ fullName: 1 }).skip(skip).limit(limit),
      Doctor.countDocuments(filter),
    ]);

    successResponse(
      res,
      {
        doctors: doctors.map(toDoctorListing),
        pagination: buildPaginationMeta(page, limit, total),
      },
      'Doctors retrieved',
    );
  }),
);

module.exports = router;

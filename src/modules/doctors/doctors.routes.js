const { Router } = require('express');
const doctorsController = require('./doctors.controller');
const { searchPublicQuerySchema, publicDoctorIdParamsSchema } = require('./doctors.validator');
const { validate } = require('../../shared/middleware/validate.middleware');

const router = Router();

/**
 * @openapi
 * /doctors/public/search:
 *   get:
 *     tags: [Doctors]
 *     summary: Search verified doctors
 */
router.get(
  '/public/search',
  validate(searchPublicQuerySchema, 'query'),
  doctorsController.searchPublic,
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
  validate(publicDoctorIdParamsSchema, 'params'),
  doctorsController.getPublicById,
);

module.exports = router;

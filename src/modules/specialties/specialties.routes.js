const { Router } = require('express');
const specialtiesController = require('./specialties.controller');
const { specialtySlugParamsSchema } = require('./specialties.validator');
const { validate } = require('../../shared/middleware/validate.middleware');

const router = Router();

router.get('/public', specialtiesController.listPublic);

router.get(
  '/public/:slug',
  validate(specialtySlugParamsSchema, 'params'),
  specialtiesController.getBySlug,
);

module.exports = router;

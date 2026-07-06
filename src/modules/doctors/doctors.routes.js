const { Router } = require('express');
const doctorsController = require('./doctors.controller');
const {
  searchPublicQuerySchema,
  publicDoctorIdParamsSchema,
} = require('./doctors.validator');
const { validate } = require('../../shared/middleware/validate.middleware');

const router = Router();

router.get(
  '/public/search',
  validate(searchPublicQuerySchema, 'query'),
  doctorsController.searchPublic,
);

router.get(
  '/public/:id',
  validate(publicDoctorIdParamsSchema, 'params'),
  doctorsController.getPublicById,
);

module.exports = router;

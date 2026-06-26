const { Router } = require('express');
const hospitalsController = require('./hospitals.controller');
const {
  listPublicQuerySchema,
  publicDetailParamsSchema,
} = require('./hospitals.validator');
const { validate } = require('../../shared/middleware/validate.middleware');

const router = Router();

router.get('/public', validate(listPublicQuerySchema, 'query'), hospitalsController.listPublic);

router.get(
  '/public/:citySlug/:slug',
  validate(publicDetailParamsSchema, 'params'),
  hospitalsController.getPublicDetail,
);

module.exports = router;

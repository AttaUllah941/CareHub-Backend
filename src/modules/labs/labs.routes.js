const { Router } = require('express');
const labsController = require('./labs.controller');
const {
  listPublicLabsQuerySchema,
  labIdParamsSchema,
  listPublicTestsParamsSchema,
  listPublicTestsQuerySchema,
} = require('./labs.validator');
const { validate, validateRequest } = require('../../shared/middleware/validate.middleware');

const router = Router();

router.get('/public', validate(listPublicLabsQuerySchema, 'query'), labsController.listPublic);

router.get(
  '/public/:id/tests',
  validateRequest({ params: listPublicTestsParamsSchema, query: listPublicTestsQuerySchema }),
  labsController.listPublicTests,
);

router.get('/public/:id', validate(labIdParamsSchema, 'params'), labsController.getPublicDetail);

module.exports = router;

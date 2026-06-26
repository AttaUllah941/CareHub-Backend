const express = require('express');
const specialtiesController = require('./specialties.controller');
const {
  createSpecialtySchema,
  updateSpecialtySchema,
} = require('./specialties.validator');
const { validateBody } = require('../../shared/middleware/validate.middleware');
const { authenticate } = require('../../shared/middleware/auth.middleware');
const { authorize } = require('../../shared/middleware/role.middleware');

const router = express.Router();

router.get('/public', specialtiesController.listPublic);
router.get('/public/:slug', specialtiesController.getPublicBySlug);

router.post(
  '/',
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN'),
  validateBody(createSpecialtySchema),
  specialtiesController.create,
);

router.put(
  '/:id',
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN'),
  validateBody(updateSpecialtySchema),
  specialtiesController.update,
);

router.delete(
  '/:id',
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN'),
  specialtiesController.remove,
);

module.exports = router;

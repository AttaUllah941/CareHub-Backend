const express = require('express');
const specialtiesController = require('./specialties.controller');
const {
  createSpecialtySchema,
  updateSpecialtySchema,
} = require('./specialties.validator');
const { validateBody } = require('../../shared/middleware/validate.middleware');
const { authenticate, authorize } = require('../../core/middleware/auth.middleware');
const { UserRole } = require('../../shared/enums/userRole.enum');

const router = express.Router();

router.get('/public', specialtiesController.listPublic);
router.get('/public/:slug', specialtiesController.getPublicBySlug);

router.post(
  '/',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  validateBody(createSpecialtySchema),
  specialtiesController.create,
);

router.put(
  '/:id',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  validateBody(updateSpecialtySchema),
  specialtiesController.update,
);

router.delete(
  '/:id',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  specialtiesController.remove,
);

module.exports = router;

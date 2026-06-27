const express = require('express');
const languagesController = require('./languages.controller');
const {
  createLanguageSchema,
  updateLanguageSchema,
} = require('./languages.validator');
const { validateBody } = require('../../shared/middleware/validate.middleware');
const { authenticate, authorize } = require('../../core/middleware/auth.middleware');
const { UserRole } = require('../../shared/enums/userRole.enum');

const router = express.Router();

router.get('/public', languagesController.listPublic);
router.get('/public/:slug', languagesController.getPublicBySlug);

router.post(
  '/',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  validateBody(createLanguageSchema),
  languagesController.create,
);

router.put(
  '/:id',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  validateBody(updateLanguageSchema),
  languagesController.update,
);

router.delete(
  '/:id',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  languagesController.remove,
);

module.exports = router;

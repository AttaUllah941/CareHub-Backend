const express = require('express');
const languagesController = require('./languages.controller');
const {
  createLanguageSchema,
  updateLanguageSchema,
} = require('./languages.validator');
const { validateBody } = require('../../shared/middleware/validate.middleware');
const { authenticate } = require('../../shared/middleware/auth.middleware');
const { authorize } = require('../../shared/middleware/role.middleware');

const router = express.Router();

router.get('/public', languagesController.listPublic);
router.get('/public/:slug', languagesController.getPublicBySlug);

router.post(
  '/',
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN'),
  validateBody(createLanguageSchema),
  languagesController.create,
);

router.put(
  '/:id',
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN'),
  validateBody(updateLanguageSchema),
  languagesController.update,
);

router.delete(
  '/:id',
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN'),
  languagesController.remove,
);

module.exports = router;

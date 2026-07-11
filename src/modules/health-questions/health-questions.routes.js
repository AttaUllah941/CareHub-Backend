const { Router } = require('express');
const healthQuestionsController = require('./health-questions.controller');
const {
  createHealthQuestionSchema,
  listPublicHealthQuestionsQuerySchema,
  listMyHealthQuestionsQuerySchema,
} = require('./health-questions.validator');
const { validate } = require('../../shared/middleware/validate.middleware');
const {
  authenticate,
  optionalAuthenticate,
  authorize,
} = require('../../core/middleware/auth.middleware');
const { UserRole } = require('../../shared/enums/userRole.enum');

const router = Router();

router.post(
  '/',
  optionalAuthenticate,
  validate(createHealthQuestionSchema),
  healthQuestionsController.create,
);

router.get(
  '/public',
  validate(listPublicHealthQuestionsQuerySchema, 'query'),
  healthQuestionsController.listPublic,
);

router.get(
  '/me',
  authenticate,
  authorize(UserRole.PATIENT),
  validate(listMyHealthQuestionsQuerySchema, 'query'),
  healthQuestionsController.listMine,
);

module.exports = router;

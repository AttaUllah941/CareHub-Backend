const { Router } = require('express');
const container = require('../../../core/container');
const validate = require('../../../core/middleware/validate.middleware');
const { authenticate, authorize } = require('../../../core/middleware/auth.middleware');
const { UserRole } = require('../../../shared/enums/userRole.enum');
const {
  languageIdParam,
  listLanguagesQueryDto,
  createLanguageDto,
  updateLanguageDto,
} = require('../dto/language.dto');

const router = Router();
const languageController = container.resolve('languageController');

router.get(
  '/all',
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.DOCTOR, UserRole.PATIENT),
  languageController.getAllActive,
);

router.use(authenticate, authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN));

router.get('/', listLanguagesQueryDto, validate, languageController.getLanguages);
router.get('/:id', languageIdParam, validate, languageController.getLanguageById);
router.post('/', createLanguageDto, validate, languageController.createLanguage);
router.put('/:id', updateLanguageDto, validate, languageController.updateLanguage);
router.delete('/:id', languageIdParam, validate, languageController.deleteLanguage);

module.exports = router;

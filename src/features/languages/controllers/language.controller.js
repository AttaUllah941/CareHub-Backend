const asyncHandler = require('../../../core/utils/asyncHandler');
const { HttpStatus } = require('../../../shared/constants/httpStatus.constants');

class LanguageController {
  constructor(languageService) {
    this.languageService = languageService;
  }

  getLanguages = asyncHandler(async (req, res) => {
    const result = await this.languageService.getLanguages(req.query, req.user);
    res.status(HttpStatus.OK).json({ success: true, data: result });
  });

  getAllActive = asyncHandler(async (req, res) => {
    const languages = await this.languageService.getAllActiveLanguages(req.user);
    res.status(HttpStatus.OK).json({ success: true, data: { languages } });
  });

  getLanguageById = asyncHandler(async (req, res) => {
    const language = await this.languageService.getLanguageById(req.params.id, req.user);
    res.status(HttpStatus.OK).json({ success: true, data: { language } });
  });

  createLanguage = asyncHandler(async (req, res) => {
    const language = await this.languageService.createLanguage(req.body, req.user);
    res.status(HttpStatus.CREATED).json({
      success: true,
      message: 'Language created successfully',
      data: { language },
    });
  });

  updateLanguage = asyncHandler(async (req, res) => {
    const language = await this.languageService.updateLanguage(req.params.id, req.body, req.user);
    res.status(HttpStatus.OK).json({
      success: true,
      message: 'Language updated successfully',
      data: { language },
    });
  });

  deleteLanguage = asyncHandler(async (req, res) => {
    const result = await this.languageService.deleteLanguage(req.params.id, req.user);
    res.status(HttpStatus.OK).json({ success: true, message: result.message });
  });
}

module.exports = LanguageController;

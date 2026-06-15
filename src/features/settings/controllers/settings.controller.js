const asyncHandler = require('../../../core/utils/asyncHandler');
const { HttpStatus } = require('../../../shared/constants/httpStatus.constants');

class SettingsController {
  constructor(settingsService) {
    this.settingsService = settingsService;
  }

  getSettings = asyncHandler(async (req, res) => {
    const settings = await this.settingsService.getSettings();
    res.status(HttpStatus.OK).json({ success: true, data: { settings } });
  });

  getPublicSettings = asyncHandler(async (req, res) => {
    const settings = await this.settingsService.getPublicSettings();
    res.status(HttpStatus.OK).json({ success: true, data: { settings } });
  });

  updateGeneral = asyncHandler(async (req, res) => {
    const settings = await this.settingsService.updateGeneral(req.body, req.user);
    res.status(HttpStatus.OK).json({ success: true, message: 'General settings updated', data: { settings } });
  });

  updateEmail = asyncHandler(async (req, res) => {
    const settings = await this.settingsService.updateEmail(req.body, req.user);
    res.status(HttpStatus.OK).json({ success: true, message: 'Email settings updated', data: { settings } });
  });

  updateSms = asyncHandler(async (req, res) => {
    const settings = await this.settingsService.updateSms(req.body, req.user);
    res.status(HttpStatus.OK).json({ success: true, message: 'SMS settings updated', data: { settings } });
  });

  updatePayment = asyncHandler(async (req, res) => {
    const settings = await this.settingsService.updatePayment(req.body, req.user);
    res.status(HttpStatus.OK).json({ success: true, message: 'Payment settings updated', data: { settings } });
  });

  updateFeatureFlags = asyncHandler(async (req, res) => {
    const settings = await this.settingsService.updateFeatureFlags(req.body, req.user);
    res.status(HttpStatus.OK).json({ success: true, message: 'Feature flags updated', data: { settings } });
  });
}

module.exports = SettingsController;

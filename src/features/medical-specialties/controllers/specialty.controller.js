const asyncHandler = require('../../../core/utils/asyncHandler');
const { HttpStatus } = require('../../../shared/constants/httpStatus.constants');

class SpecialtyController {
  constructor(specialtyService) {
    this.specialtyService = specialtyService;
  }

  getSpecialties = asyncHandler(async (req, res) => {
    const result = await this.specialtyService.getSpecialties(req.query, req.user);
    res.status(HttpStatus.OK).json({ success: true, data: result });
  });

  getAllActive = asyncHandler(async (req, res) => {
    const specialties = await this.specialtyService.getAllActiveSpecialties(req.user);
    res.status(HttpStatus.OK).json({ success: true, data: { specialties } });
  });

  getPublicSpecialties = asyncHandler(async (_req, res) => {
    const specialties = await this.specialtyService.getPublicSpecialties();
    res.status(HttpStatus.OK).json({ success: true, data: { specialties } });
  });

  getSpecialtyById = asyncHandler(async (req, res) => {
    const specialty = await this.specialtyService.getSpecialtyById(req.params.id, req.user);
    res.status(HttpStatus.OK).json({ success: true, data: { specialty } });
  });

  createSpecialty = asyncHandler(async (req, res) => {
    const specialty = await this.specialtyService.createSpecialty(req.body, req.user);
    res.status(HttpStatus.CREATED).json({
      success: true,
      message: 'Medical specialty created successfully',
      data: { specialty },
    });
  });

  updateSpecialty = asyncHandler(async (req, res) => {
    const specialty = await this.specialtyService.updateSpecialty(req.params.id, req.body, req.user);
    res.status(HttpStatus.OK).json({
      success: true,
      message: 'Medical specialty updated successfully',
      data: { specialty },
    });
  });

  deleteSpecialty = asyncHandler(async (req, res) => {
    const result = await this.specialtyService.deleteSpecialty(req.params.id, req.user);
    res.status(HttpStatus.OK).json({ success: true, message: result.message });
  });
}

module.exports = SpecialtyController;

const asyncHandler = require('../../../core/utils/asyncHandler');
const { HttpStatus } = require('../../../shared/constants/httpStatus.constants');

class ClinicController {
  constructor(clinicService) {
    this.clinicService = clinicService;
  }

  getClinics = asyncHandler(async (req, res) => {
    const result = await this.clinicService.getClinics(req.query, req.user);
    res.status(HttpStatus.OK).json({ success: true, data: result });
  });

  getAllActive = asyncHandler(async (req, res) => {
    const clinics = await this.clinicService.getAllActiveClinics(req.user);
    res.status(HttpStatus.OK).json({ success: true, data: { clinics } });
  });

  getMyClinic = asyncHandler(async (req, res) => {
    const clinic = await this.clinicService.getMyClinic(req.user);
    res.status(HttpStatus.OK).json({ success: true, data: { clinic } });
  });

  getClinicById = asyncHandler(async (req, res) => {
    const clinic = await this.clinicService.getClinicById(req.params.id, req.user);
    res.status(HttpStatus.OK).json({ success: true, data: { clinic } });
  });

  createClinic = asyncHandler(async (req, res) => {
    const clinic = await this.clinicService.createClinic(req.body, req.user);
    res.status(HttpStatus.CREATED).json({
      success: true,
      message: 'Clinic created successfully',
      data: { clinic },
    });
  });

  updateClinic = asyncHandler(async (req, res) => {
    const clinic = await this.clinicService.updateClinic(req.params.id, req.body, req.user);
    res.status(HttpStatus.OK).json({
      success: true,
      message: 'Clinic updated successfully',
      data: { clinic },
    });
  });

  updateMyClinic = asyncHandler(async (req, res) => {
    const clinic = await this.clinicService.updateMyClinic(req.body, req.user);
    res.status(HttpStatus.OK).json({
      success: true,
      message: 'Clinic updated successfully',
      data: { clinic },
    });
  });

  assignDoctors = asyncHandler(async (req, res) => {
    const clinic = await this.clinicService.assignDoctors(
      req.params.id,
      req.body.doctorProfileIds,
      req.user,
    );
    res.status(HttpStatus.OK).json({
      success: true,
      message: 'Doctors assigned successfully',
      data: { clinic },
    });
  });

  assignMyDoctors = asyncHandler(async (req, res) => {
    const clinic = await this.clinicService.assignMyDoctors(req.body.doctorProfileIds, req.user);
    res.status(HttpStatus.OK).json({
      success: true,
      message: 'Doctors assigned successfully',
      data: { clinic },
    });
  });

  deleteClinic = asyncHandler(async (req, res) => {
    const result = await this.clinicService.deleteClinic(req.params.id, req.user);
    res.status(HttpStatus.OK).json({ success: true, message: result.message });
  });
}

module.exports = ClinicController;

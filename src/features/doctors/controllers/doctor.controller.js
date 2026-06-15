const asyncHandler = require('../../../core/utils/asyncHandler');
const { HttpStatus } = require('../../../shared/constants/httpStatus.constants');

class DoctorController {
  constructor(doctorService) {
    this.doctorService = doctorService;
  }

  getDoctors = asyncHandler(async (req, res) => {
    const result = await this.doctorService.getDoctors(req.query, req.user);
    res.status(HttpStatus.OK).json({ success: true, data: result });
  });

  searchDoctors = asyncHandler(async (req, res) => {
    const result = await this.doctorService.searchDoctors(req.query, req.user);
    res.status(HttpStatus.OK).json({ success: true, data: result });
  });

  getMyProfile = asyncHandler(async (req, res) => {
    const doctor = await this.doctorService.getMyProfile(req.user);
    res.status(HttpStatus.OK).json({ success: true, data: { doctor } });
  });

  getDoctorById = asyncHandler(async (req, res) => {
    const doctor = await this.doctorService.getDoctorById(req.params.id, req.user);
    res.status(HttpStatus.OK).json({ success: true, data: { doctor } });
  });

  createDoctor = asyncHandler(async (req, res) => {
    const doctor = await this.doctorService.createDoctor(req.body, req.user);
    res.status(HttpStatus.CREATED).json({
      success: true,
      message: 'Doctor created successfully',
      data: { doctor },
    });
  });

  updateDoctor = asyncHandler(async (req, res) => {
    const doctor = await this.doctorService.updateDoctor(req.params.id, req.body, req.user);
    res.status(HttpStatus.OK).json({
      success: true,
      message: 'Doctor updated successfully',
      data: { doctor },
    });
  });

  updateMyProfile = asyncHandler(async (req, res) => {
    const doctor = await this.doctorService.updateMyProfile(req.body, req.user);
    res.status(HttpStatus.OK).json({
      success: true,
      message: 'Profile updated successfully',
      data: { doctor },
    });
  });

  createMyProfile = asyncHandler(async (req, res) => {
    const doctor = await this.doctorService.createMyProfile(req.body, req.user);
    res.status(HttpStatus.CREATED).json({
      success: true,
      message: 'Profile created successfully',
      data: { doctor },
    });
  });

  verifyDoctor = asyncHandler(async (req, res) => {
    const doctor = await this.doctorService.verifyDoctor(req.params.id, req.body, req.user);
    res.status(HttpStatus.OK).json({
      success: true,
      message: 'Verification status updated',
      data: { doctor },
    });
  });

  deleteDoctor = asyncHandler(async (req, res) => {
    const result = await this.doctorService.deleteDoctor(req.params.id, req.user);
    res.status(HttpStatus.OK).json({ success: true, message: result.message });
  });
}

module.exports = DoctorController;

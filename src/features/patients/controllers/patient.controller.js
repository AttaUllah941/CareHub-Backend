const asyncHandler = require('../../../core/utils/asyncHandler');
const { HttpStatus } = require('../../../shared/constants/httpStatus.constants');

class PatientController {
  constructor(patientService) {
    this.patientService = patientService;
  }

  getPatients = asyncHandler(async (req, res) => {
    const result = await this.patientService.getPatients(req.query, req.user);
    res.status(HttpStatus.OK).json({ success: true, data: result });
  });

  getPatientById = asyncHandler(async (req, res) => {
    const patient = await this.patientService.getPatientById(req.params.id, req.user);
    res.status(HttpStatus.OK).json({ success: true, data: { patient } });
  });

  getMyProfile = asyncHandler(async (req, res) => {
    const patient = await this.patientService.getMyProfile(req.user);
    res.status(HttpStatus.OK).json({ success: true, data: { patient } });
  });

  createPatient = asyncHandler(async (req, res) => {
    const patient = await this.patientService.createPatient(req.body, req.user);
    res.status(HttpStatus.CREATED).json({
      success: true,
      message: 'Patient created successfully',
      data: { patient },
    });
  });

  updatePatient = asyncHandler(async (req, res) => {
    const patient = await this.patientService.updatePatient(req.params.id, req.body, req.user);
    res.status(HttpStatus.OK).json({
      success: true,
      message: 'Patient updated successfully',
      data: { patient },
    });
  });

  createMyProfile = asyncHandler(async (req, res) => {
    const patient = await this.patientService.createMyProfile(req.body, req.user);
    res.status(HttpStatus.CREATED).json({
      success: true,
      message: 'Patient profile created successfully',
      data: { patient },
    });
  });

  updateMyProfile = asyncHandler(async (req, res) => {
    const patient = await this.patientService.updateMyProfile(req.body, req.user);
    res.status(HttpStatus.OK).json({
      success: true,
      message: 'Patient profile updated successfully',
      data: { patient },
    });
  });

  deletePatient = asyncHandler(async (req, res) => {
    const result = await this.patientService.deletePatient(req.params.id, req.user);
    res.status(HttpStatus.OK).json({ success: true, message: result.message });
  });
}

module.exports = PatientController;

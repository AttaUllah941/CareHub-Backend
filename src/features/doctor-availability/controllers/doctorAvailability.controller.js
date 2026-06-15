const asyncHandler = require('../../../core/utils/asyncHandler');
const { HttpStatus } = require('../../../shared/constants/httpStatus.constants');

class DoctorAvailabilityController {
  constructor(doctorAvailabilityService) {
    this.doctorAvailabilityService = doctorAvailabilityService;
  }

  getMyAvailability = asyncHandler(async (req, res) => {
    const availability = await this.doctorAvailabilityService.getMyAvailability(req.user);
    res.status(HttpStatus.OK).json({ success: true, data: { availability } });
  });

  updateMyAvailability = asyncHandler(async (req, res) => {
    const availability = await this.doctorAvailabilityService.updateMyAvailability(req.body, req.user);
    res.status(HttpStatus.OK).json({
      success: true,
      message: 'Availability updated successfully',
      data: { availability },
    });
  });

  getMySlots = asyncHandler(async (req, res) => {
    const result = await this.doctorAvailabilityService.getMySlots(req.query.date, req.user);
    res.status(HttpStatus.OK).json({ success: true, data: result });
  });

  getAvailability = asyncHandler(async (req, res) => {
    const availability = await this.doctorAvailabilityService.getAvailabilityByDoctorProfileId(
      req.params.doctorProfileId,
      req.user,
    );
    res.status(HttpStatus.OK).json({ success: true, data: { availability } });
  });

  updateAvailability = asyncHandler(async (req, res) => {
    const availability = await this.doctorAvailabilityService.updateAvailabilityByDoctorProfileId(
      req.params.doctorProfileId,
      req.body,
      req.user,
    );
    res.status(HttpStatus.OK).json({
      success: true,
      message: 'Availability updated successfully',
      data: { availability },
    });
  });

  getSlots = asyncHandler(async (req, res) => {
    const result = await this.doctorAvailabilityService.getSlots(
      req.params.doctorProfileId,
      req.query.date,
      req.user,
    );
    res.status(HttpStatus.OK).json({ success: true, data: result });
  });
}

module.exports = DoctorAvailabilityController;

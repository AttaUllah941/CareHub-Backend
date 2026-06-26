const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../errors/AppError');
const doctorContextService = require('../services/doctorContext.service');

/**
 * Loads req.doctor for authenticated doctor routes.
 */
const loadDoctorProfile = asyncHandler(async (req, _res, next) => {
  req.doctor = await doctorContextService.getDoctorByUserId(req.user.id);
  next();
});

/**
 * Factory for resource-owner middleware using an async resource loader.
 * @param {(req) => Promise<{ doctorId: unknown } | null>} loadResource
 * @param {string} [notFoundMessage]
 */
const requireResourceOwner = (loadResource, notFoundMessage = 'Resource not found') =>
  asyncHandler(async (req, _res, next) => {
    if (!req.doctor) {
      req.doctor = await doctorContextService.getDoctorByUserId(req.user.id);
    }

    const resource = await loadResource(req);

    if (!resource) {
      throw new AppError(notFoundMessage, 404);
    }

    doctorContextService.assertDoctorOwnsResource(req.doctor, resource.doctorId);

    req.resource = resource;
    next();
  });

module.exports = {
  loadDoctorProfile,
  requireResourceOwner,
};

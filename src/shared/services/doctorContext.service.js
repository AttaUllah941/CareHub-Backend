const AppError = require('../errors/AppError');
const doctorsRepository = require('../../modules/doctors/doctors.repository');

/**
 * Resolves the doctor profile for an authenticated user.
 */
const getDoctorByUserId = async (userId) => {
  const doctor = await doctorsRepository.findByUserId(userId);

  if (!doctor) {
    throw new AppError('Doctor profile not found', 404);
  }

  return doctor;
};

/**
 * Ensures a resource belongs to the given doctor.
 */
const assertDoctorOwnsResource = (doctor, resourceDoctorId, message) => {
  const doctorId = doctor._id.toString();
  const ownerId = resourceDoctorId?._id?.toString() || resourceDoctorId?.toString();

  if (doctorId !== ownerId) {
    throw new AppError(message || 'You do not have permission to access this resource', 403);
  }
};

module.exports = {
  getDoctorByUserId,
  assertDoctorOwnsResource,
};

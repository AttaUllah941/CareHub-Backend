const authService = require('../../auth/auth.service');

/**
 * Contact details of the signed-in patient, read through the existing auth service.
 * Used to prefill booking/order forms so the model never has to guess identity data.
 */
const getPatientProfile = async (userId) => {
  const { user } = await authService.getMe(userId);
  return {
    name: `${user.firstName} ${user.lastName}`.trim(),
    phone: user.phone || '',
    email: user.email || '',
  };
};

module.exports = { getPatientProfile };

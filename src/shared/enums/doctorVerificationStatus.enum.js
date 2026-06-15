const DoctorVerificationStatus = Object.freeze({
  PENDING: 'PENDING',
  VERIFIED: 'VERIFIED',
  REJECTED: 'REJECTED',
});

const DOCTOR_VERIFICATION_STATUSES = Object.values(DoctorVerificationStatus);

module.exports = { DoctorVerificationStatus, DOCTOR_VERIFICATION_STATUSES };

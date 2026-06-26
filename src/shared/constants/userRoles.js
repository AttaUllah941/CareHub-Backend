const USER_ROLES = Object.freeze([
  'SUPER_ADMIN',
  'ADMIN',
  'DOCTOR',
  'PATIENT',
  'CLINIC_MANAGER',
  'PHARMACY',
  'LAB',
]);

const PUBLIC_REGISTRATION_ROLES = Object.freeze([
  'PATIENT',
  'DOCTOR',
  'CLINIC_MANAGER',
]);

module.exports = { USER_ROLES, PUBLIC_REGISTRATION_ROLES };

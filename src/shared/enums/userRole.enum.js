/**
 * User roles — aligned with CareHub frontend (auth.model.ts).
 */
const UserRole = Object.freeze({
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  DOCTOR: 'DOCTOR',
  PATIENT: 'PATIENT',
  CLINIC_MANAGER: 'CLINIC_MANAGER',
  PHARMACY: 'PHARMACY',
  LAB: 'LAB',
});

const USER_ROLES = Object.freeze(Object.values(UserRole));

const PUBLIC_REGISTRATION_ROLES = Object.freeze([
  UserRole.PATIENT,
  UserRole.DOCTOR,
  UserRole.CLINIC_MANAGER,
]);

module.exports = { UserRole, USER_ROLES, PUBLIC_REGISTRATION_ROLES };
